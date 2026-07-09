from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('planner', '0002_move_category_from_events_to_tasks'),
    ]

    operations = [
        migrations.AddField(
            model_name='event',
            name='color_code',
            field=models.CharField(default='#6366F1', max_length=20),
        ),
    ]
