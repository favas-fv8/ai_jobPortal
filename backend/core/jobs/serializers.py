from rest_framework import serializers
from .models import Job, JobSkill


class JobSkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobSkill
        fields = ['id', 'name', 'category']


class JobSerializer(serializers.ModelSerializer):
    recruiter_name = serializers.CharField(source='recruiter.get_full_name', read_only=True)
    skills = JobSkillSerializer(many=True, read_only=True)
    application_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Job
        fields = ['id', 'recruiter', 'recruiter_name', 'title', 'description', 'company',
                  'location', 'job_type', 'experience_level', 'salary_min', 'salary_max',
                  'requirements', 'responsibilities', 'skills_required', 'status',
                  'is_active', 'skills', 'application_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'recruiter', 'application_count', 'created_at', 'updated_at']


class JobCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Job
        fields = ['id', 'title', 'description', 'company', 'location', 'job_type',
                  'experience_level', 'salary_min', 'salary_max', 'requirements',
                  'responsibilities', 'skills_required', 'status']
        read_only_fields = ['id']

    def validate(self, attrs):
        if attrs.get('salary_min') and attrs.get('salary_max'):
            if attrs['salary_min'] > attrs['salary_max']:
                raise serializers.ValidationError(
                    {'salary_min': 'Salary minimum cannot be greater than salary maximum.'})
        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['recruiter'] = request.user
        return super().create(validated_data)
