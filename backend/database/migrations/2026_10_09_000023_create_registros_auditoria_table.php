<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Quién entró como una cuenta, quién abrió qué historia, quién reseteó contraseñas. Solo inserción.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registros_auditoria', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cuenta_id')->nullable()->constrained('cuentas')->nullOnDelete();
            $table->enum('actor_tipo', ['usuario', 'administrador']);
            $table->unsignedBigInteger('actor_id');
            $table->string('accion', 60)->comment('impersonar, ver_historia, reset_password…');
            $table->string('entidad', 60)->nullable();
            $table->unsignedBigInteger('entidad_id')->nullable();
            $table->string('ip', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['cuenta_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registros_auditoria');
    }
};
