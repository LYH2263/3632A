from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('merchants', '0003_add_low_stock_threshold'),
    ]

    operations = [
        migrations.AddField(
            model_name='merchant',
            name='delivery_radius_km',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='merchant',
            name='latitude',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='merchant',
            name='longitude',
            field=models.FloatField(blank=True, null=True),
        ),
    ]
