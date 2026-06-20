from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='settled_at',
            field=models.DateTimeField(null=True, blank=True, default=None),
        ),
    ]
