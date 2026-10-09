<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Cobros de membresía registrados a mano desde /gestion.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pagos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cuenta_id')->constrained('cuentas')->restrictOnDelete();
            $table->char('periodo', 7)->comment('YYYY-MM');
            $table->date('fecha');
            $table->decimal('monto', 12, 2);
            $table->enum('medio', ['transferencia', 'efectivo', 'mercadopago', 'otro']);
            $table->string('notas')->nullable();
            $table->foreignId('registrado_por')->nullable()->constrained('administradores')->nullOnDelete();
            $table->timestamps();

            $table->unique(['cuenta_id', 'periodo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pagos');
    }
};
