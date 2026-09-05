from django.shortcuts import get_object_or_404
from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend, FilterSet
from django.db.models import Count
from .models import Job
from .serializers import JobSerializer, JobCreateSerializer
from rest_framework.permissions import IsAuthenticated, IsAdminUser


class IsRecruiterOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.user.is_admin_user:
            return True
        return obj.recruiter == request.user


class JobFilter(FilterSet):
    class Meta:
        model = Job
        fields = ['job_type', 'experience_level', 'status', 'location', 'company']


class JobViewSet(viewsets.ModelViewSet):
    queryset = Job.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = JobFilter
    search_fields = ['title', 'company', 'location', 'description']
    ordering_fields = ['created_at', 'title', 'salary_min', 'salary_max']

    def get_serializer_class(self):
        if self.request.method in ['POST', 'PUT', 'PATCH']:
            return JobCreateSerializer
        return JobSerializer

    def get_permissions(self):
        if self.action == 'create' or self.action == 'update' or self.action == 'partial_update' \
                or self.action == 'destroy':
            return [IsRecruiterOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = Job.objects.all().annotate(
            application_count=Count('applications')
        ).prefetch_related('job_skills')

        if self.request.user.is_authenticated and not self.request.user.is_admin_user:
            if self.request.user.is_recruiter:
                qs = qs.filter(recruiter=self.request.user)
            else:
                qs = qs.filter(status='open', is_active=True)

        return qs

    def get_object(self):
        pk = self.kwargs.get('pk')
        qs = Job.objects.annotate(
            application_count=Count('applications')
        ).prefetch_related('job_skills')

        if self.request.user.is_admin_user:
            return get_object_or_404(qs, pk=pk)
        if self.request.user.is_recruiter:
            return get_object_or_404(qs.filter(recruiter=self.request.user), pk=pk)
        return get_object_or_404(qs, pk=pk)

    def perform_destroy(self, instance):
        instance.delete()
