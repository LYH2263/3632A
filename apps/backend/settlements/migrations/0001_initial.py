from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('orders', '0002_order_settled_at'),
        ('merchants', '0004_add_delivery_range_fields'),
        ('users', '0003_add_address_coords'),
    ]

    operations = [
        migrations.CreateModel(
            name='SettlementStatement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('statement_no', models.CharField(max_length=40, unique=True)),
                ('period_year', models.IntegerField()),
                ('period_month', models.IntegerField()),
                ('status', models.CharField(choices=[('draft', 'draft'), ('confirmed', 'confirmed')], default='draft', max_length=20)),
                ('order_count', models.IntegerField(default=0)),
                ('items_amount_total', models.DecimalField(decimal_places=2, default='0.00', max_digits=12)),
                ('delivery_fee_total', models.DecimalField(decimal_places=2, default='0.00', max_digits=12)),
                ('commission_rate', models.DecimalField(decimal_places=4, default='0.0500', max_digits=6)),
                ('commission_amount', models.DecimalField(decimal_places=2, default='0.00', max_digits=12)),
                ('settle_amount', models.DecimalField(decimal_places=2, default='0.00', max_digits=12)),
                ('confirmed_at', models.DateTimeField(null=True, blank=True, default=None)),
                ('confirmed_by', models.ForeignKey(null=True, blank=True, default=None, on_delete=django.db.models.deletion.SET_NULL, related_name='confirmed_settlements', to='users.storeuser')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('merchant', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='settlement_statements', to='merchants.merchant')),
            ],
            options={
                'db_table': 'settlement_statement',
                'unique_together': {('merchant', 'period_year', 'period_month')},
            },
        ),
        migrations.CreateModel(
            name='SettlementItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('items_amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('delivery_fee', models.DecimalField(decimal_places=2, max_digits=10)),
                ('commission_amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('settle_amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('order', models.OneToOneField(on_delete=django.db.models.deletion.PROTECT, related_name='settlement_item', to='orders.order')),
                ('statement', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='settlements.settlementstatement')),
            ],
            options={
                'db_table': 'settlement_item',
            },
        ),
    ]
