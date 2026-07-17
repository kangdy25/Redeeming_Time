from django.db import migrations, models


def mark_existing_users_verified(apps, schema_editor):
    """Do not lock out accounts created before email verification existed."""

    apps.get_model('accounts', 'User').objects.all().update(email_verified=True)


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0002_unique_social_provider_identity'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='email_verified',
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(mark_existing_users_verified, migrations.RunPython.noop),
    ]
