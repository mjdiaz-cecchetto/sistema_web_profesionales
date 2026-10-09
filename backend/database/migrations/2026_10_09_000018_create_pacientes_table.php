<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Padrón POR CUENTA, compartido por los profesionales del consultorio. Sin login.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pacientes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cuenta_id')->constrained('cuentas')->cascadeOnDelete();
            $table->string('nombre', 100);
            $table->string('apellido', 100);
            $table->string('dni', 9);
            $table->string('email', 190)->nullable();
            $table->string('telefono', 20)->comment('WhatsApp para avisos');
            $table->unsignedBigInteger('obra_social_id')->nullable()->comment('NULL = particular');
            $table->string('nro_afiliado', 40)->nullable();
            $table->date('fecha_alta');
            $table->timestamps();

            $table->unique(['cuenta_id', 'dni']);
            $table->index(['cuenta_id', 'apellido']);
            $table->foreign(['obra_social_id', 'cuenta_id'])->references(['id', 'cuenta_id'])->on('obras_sociales')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pacientes');
    }
};
