<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Avisos por WhatsApp o email.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notificaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cuenta_id')->constrained('cuentas');
            $table->foreignId('turno_id')->nullable()->constrained('turnos')->cascadeOnDelete();
            $table->enum('evento', ['solicitud_nueva', 'confirmado', 'reprogramado', 'cancelado', 'recordatorio']);
            $table->enum('origen', ['panel', 'paciente', 'sistema']);
            $table->enum('canal', ['whatsapp', 'email']);
            $table->enum('destinatario_tipo', ['paciente', 'profesional', 'secretaria']);
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios')->nullOnDelete()
                ->comment('Persona destinataria cuando es secretaría');
            $table->string('destinatario', 150)->comment('Nombre, copiado al enviar');
            $table->string('destino', 190)->comment('Teléfono o email');
            $table->text('mensaje');
            $table->enum('estado', ['pendiente', 'enviada', 'fallida', 'simulada'])->default('pendiente');
            $table->timestamp('enviada_at')->nullable();
            $table->string('error')->nullable()->comment('Respuesta del proveedor si falló');
            $table->timestamps();

            $table->index(['cuenta_id', 'created_at']);
            $table->index('estado');
            $table->index(['turno_id', 'evento']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notificaciones');
    }
};
