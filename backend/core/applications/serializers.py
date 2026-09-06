from rest_framework import serializers
from .models import Application
from core.jobs.models import Job


class ApplicationSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source='job.title', read_only=True)
    job_company = serializers.CharField(source='job.company', read_only=True)
    job_status = serializers.CharField(source='job.status', read_only=True)
    applicant_name = serializers.CharField(source='applicant.get_full_name', read_only=True)
    applicant_username = serializers.CharField(source='applicant.username', read_only=True)
    recruiter_id = serializers.UUIDField(source='job.recruiter_id', read_only=True)

    class Meta:
        model = Application
        fields = ['id', 'job', 'job_title', 'job_company', 'job_status', 'applicant',
                  'applicant_name', 'applicant_username', 'recruiter_id', 'resume',
                  'cover_letter', 'status', 'notes', 'match_score', 'matched_skills',
                  'missing_skills', 'ai_analysis', 'is_ai_analyzed', 'match_source',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'applicant', 'match_score', 'matched_skills',
                            'missing_skills', 'ai_analysis', 'is_ai_analyzed',
                            'match_source', 'created_at', 'updated_at']


class ApplicationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = ['id', 'job', 'resume', 'cover_letter']

    def validate(self, attrs):
        job = attrs.get('job')
        if not job or not job.is_active or job.status != 'open':
            raise serializers.ValidationError({'job': 'This job is not accepting applications.'})
        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['applicant'] = request.user
        return super().create(validated_data)


class ApplicationStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = ['status', 'notes']

    def validate_status(self, value):
        allowed = ['under_review', 'interview', 'offer', 'hired', 'rejected']
        if value not in allowed:
            raise serializers.ValidationError(f"Invalid status transition to '{value}'.")
        return value
