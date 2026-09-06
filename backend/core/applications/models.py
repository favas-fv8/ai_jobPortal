from django.db import models
from django.conf import settings
import uuid


class Application(models.Model):
    STATUS_CHOICES = [
        ('submitted', 'Submitted'),
        ('under_review', 'Under Review'),
        ('interview', 'Interview'),
        ('offer', 'Offer Given'),
        ('hired', 'Hired'),
        ('rejected', 'Rejected'),
        ('withdrawn', 'Withdrawn'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey('jobs.Job', on_delete=models.CASCADE, related_name='applications')
    applicant = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='applications'
    )
    resume = models.ForeignKey('resumes.Resume', on_delete=models.SET_NULL,
                               related_name='applications', null=True, blank=True)
    cover_letter = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='submitted')
    notes = models.TextField(blank=True, default='')

    # AI matching results
    match_score = models.FloatField(null=True, blank=True)
    matched_skills = models.JSONField(default=list, blank=True)
    missing_skills = models.JSONField(default=list, blank=True)
    ai_analysis = models.JSONField(default=dict, blank=True)
    is_ai_analyzed = models.BooleanField(default=False)
    match_source = models.CharField(
        max_length=10,
        choices=[('ai', 'AI'), ('local', 'Local')],
        default='local',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('job', 'applicant')

    def __str__(self):
        return f"{self.applicant.username} - {self.job.title}"
