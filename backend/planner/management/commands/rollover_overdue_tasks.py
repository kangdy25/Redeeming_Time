from django.core.management.base import BaseCommand, CommandError
from django.utils.dateparse import parse_date

from planner.services import rollover_overdue_tasks


class Command(BaseCommand):
    help = 'Move incomplete tasks due before the target date to that date.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--date',
            help='Target date in YYYY-MM-DD format. Defaults to today in PLANNER_TIME_ZONE.',
        )
        parser.add_argument(
            '--calendar-id',
            type=int,
            help='Limit the rollover to one calendar.',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Report how many tasks would move without changing them.',
        )

    def handle(self, *args, **options):
        target_date = None
        if options['date']:
            try:
                target_date = parse_date(options['date'])
            except ValueError:
                target_date = None
            if target_date is None:
                raise CommandError('--date must use YYYY-MM-DD format.')
        if options['calendar_id'] is not None and options['calendar_id'] < 1:
            raise CommandError('--calendar-id must be a positive integer.')

        result = rollover_overdue_tasks(
            calendar_id=options['calendar_id'],
            target_date=target_date,
            dry_run=options['dry_run'],
        )
        prefix = 'Would roll over' if result['dry_run'] else 'Rolled over'
        self.stdout.write(
            self.style.SUCCESS(
                f"{prefix} {result['updated_count']} overdue task(s) to {result['target_date']}.",
            ),
        )
