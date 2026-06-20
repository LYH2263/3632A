from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = '重置数据库并重新灌入 MVP 示例数据'

    def handle(self, *args, **options):
        call_command('migrate', '--noinput')
        call_command('flush', '--noinput')
        call_command('seed_mvp_data')
        self.stdout.write(self.style.SUCCESS('MVP 数据重置完成'))
