from django.db import migrations, models


def add_settled_at_if_missing(apps, schema_editor):
    table = 'order_info'
    column = 'settled_at'
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT COUNT(*)
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = %s
              AND COLUMN_NAME = %s
            """,
            [table, column],
        )
        if cursor.fetchone()[0]:
            return

        field = models.DateTimeField(null=True, blank=True, default=None)
        field.set_attributes_from_name(column)
        schema_editor.add_field(apps.get_model('orders', 'Order'), field)


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0001_initial'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='order',
                    name='settled_at',
                    field=models.DateTimeField(null=True, blank=True, default=None),
                ),
            ],
            database_operations=[
                migrations.RunPython(add_settled_at_if_missing, migrations.RunPython.noop),
            ],
        ),
    ]
