from django.db.models import Count
from django.db.models.functions import Lower
import logging
from rest_framework import viewsets, permissions, status, serializers
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend, FilterSet
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Application
from .serializers import (
    ApplicationSerializer, ApplicationCreateSerializer, ApplicationStatusUpdateSerializer
)
from .services import ensure_application_match
from core.ai_services.services import analyze_job_application
from core.ai_services.parser import extract_resume_text

logger = logging.getLogger(__name__)


class IsRecruiterForJob(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.is_admin_user:
            return True
        if request.method in ['GET', 'POST']:
            return True
        return obj.job.recruiter == request.user


class ApplicationFilter(FilterSet):
    class Meta:
        model = Application
        fields = ['status', 'job', 'is_ai_analyzed']


class ApplicationViewSet(viewsets.ModelViewSet):
    queryset = Application.objects.all()
    serializer_class = ApplicationSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ApplicationFilter
    search_fields = ['job__title', 'applicant__username', 'applicant__first_name',
                     'applicant__last_name', 'matched_skills']
    ordering_fields = ['created_at', 'match_score']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ApplicationCreateSerializer
        if self.request.method in ['PATCH'] and self.request.user.is_authenticated and \
                (self.request.user.is_recruiter or self.request.user.is_admin_user):
            return ApplicationStatusUpdateSerializer
        return ApplicationSerializer

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin_user:
            return Application.objects.all()
        if user.is_recruiter:
            return Application.objects.filter(job__recruiter=user)
        return Application.objects.filter(applicant=user)

    def _ensure_matches(self, queryset):
        """Backfill local match data for applications that lack it, using
        already-saved resume/job analysis data (no Gemini call)."""
        apps = queryset.filter(is_ai_analyzed=False).select_related('resume', 'job')
        for application in apps:
            ensure_application_match(application)
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        self._ensure_matches(queryset)
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        application = self.get_object()
        ensure_application_match(application)
        return Response(ApplicationSerializer(application).data)

    def perform_create(self, serializer):
        application = serializer.save(applicant=self.request.user)
        ensure_application_match(application)

    @action(detail=True, methods=['post'])
    def analyze_with_ai(self, request, pk=None):
        application = self.get_object()

        # Permission: Only recruiter of job or admin
        if not (request.user.is_admin_user or application.job.recruiter == request.user):
            return Response({'error': 'You do not have permission to analyze this application.'},
                            status=status.HTTP_403_FORBIDDEN)

        if not application.resume:
            return Response({'error': 'Applicant has no resume to analyze.'},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            job_text = f"{application.job.title}\n{application.job.description}\n" \
                       f"Requirements: {', '.join(application.job.requirements if isinstance(application.job.requirements, list) else [])}"
            resume_text = ''
            if application.resume.parsed_raw_text:
                resume_text = application.resume.parsed_raw_text
            else:
                resume_text = extract_resume_text(
                    application.resume.file.path, application.resume.file_format)

            result = analyze_job_application(job_text, resume_text, application.resume.skills)

            application.match_score = result.get('match_score', 0)
            application.matched_skills = result.get('matched_skills', [])
            application.missing_skills = result.get('missing_skills', [])
            application.ai_analysis = result
            application.is_ai_analyzed = True
            application.match_source = 'ai'
            application.save()

            return Response(ApplicationSerializer(application).data)
        except Exception:
            logger.exception('AI analysis failed for application %s', application.pk)
            return Response({'error': 'AI analysis failed. Please try again later.'},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # For job seekers, list their own applications
    # For recruiters, allow sorting/filtering by match_score which is handled by ordering_fields
    @action(detail=False, methods=['get'])
    def my_applications(self, request):
        applications = Application.objects.filter(applicant=request.user)
        self._ensure_matches(applications)
        serializer = ApplicationSerializer(applications, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def withdraw(self, request, pk=None):
        application = self.get_object()

        # Permission: Only the applicant or an admin can withdraw
        if not (request.user.is_admin_user or request.user == application.applicant):
            return Response({'error': 'You do not have permission to withdraw this application.'},
                            status=status.HTTP_403_FORBIDDEN)

        if application.status == 'withdrawn':
            return Response({'error': 'This application is already withdrawn.'},
                            status=status.HTTP_400_BAD_REQUEST)

        application.status = 'withdrawn'
        application.save()
        return Response(ApplicationSerializer(application).data)
