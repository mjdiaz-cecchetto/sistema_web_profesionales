<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Cada turno. Las reglas de oro quedan garantizadas por índices únicos (ver ocupa_lugar).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('turnos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cuenta_id')->constrained('cuentas');
            $table->unsignedBigInteger('profesional_id');
            $table->foreignId('paciente_id')->constrained('pacientes')->restrictOnDelete();
            $table->foreignId('servicio_id')->constrained('servicios')->restrictOnDelete();
            $table->foreignId('lugar_atencion_id')->nullable()->constrained('lugares_atencion')->nullOnDelete();
            $table->foreignId('serie_id')->nullable()->constrained('series_turnos')->nullOnDelete();
            $table->unsignedBigInteger('obra_social_id')->nullable()->comment('Cobertura usada en ESE turno. NULL = particular');
            $table->date('fecha');
            $table->time('hora');
            $table->unsignedSmallInteger('duracion_minutos')->comment('Copia del servicio al reservar');
            $table->enum('estado', ['pendiente', 'confirmado', 'cancelado', 'asistio', 'ausente', 'vencido'])->default('pendiente');
            $table->enum('origen', ['panel', 'online']);
            $table->text('notas')->nullable();
            $table->foreignId('creado_por')->nullable()->constrained('miembros')->nullOnDelete()
                ->comment('NULL si lo pidió el paciente online');
            // 1 mientras el turno ocupa el horario; NULL si está cancelado o vencido.
            // MySQL ignora los NULL en los índices únicos: así se puede reutilizar el horario.
            $table->tinyInteger('ocupa_lugar')->nullable()
                ->storedAs("IF(`estado` IN ('cancelado', 'vencido'), NULL, 1)");
            $table->timestamps();

            $table->foreign(['profesional_id', 'cuenta_id'])->references(['id', 'cuenta_id'])->on('profesionales')->restrictOnDelete();
            $table->foreign(['obra_social_id', 'cuenta_id'])->references(['id', 'cuenta_id'])->on('obras_sociales')->restrictOnDelete();

            $table->unique(['profesional_id', 'fecha', 'hora', 'ocupa_lugar'], 'turnos_un_turno_por_horario');
            $table->unique(['profesional_id', 'paciente_id', 'fecha', 'ocupa_lugar'], 'turnos_un_turno_por_dia');
            $table->index(['cuenta_id', 'fecha']);
            $table->index(['paciente_id', 'fecha']);
            $table->index(['estado', 'fecha']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('turnos');
    }
};
