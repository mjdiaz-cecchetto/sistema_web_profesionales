<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * El tenant: un consultorio o un profesional independiente. No tiene credenciales.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cuentas', function (Blueprint $table) {
            $table->id();
            $table->enum('tipo', ['consultorio', 'profesional']);
            $table->string('nombre', 150);
            $table->string('slug', 120)->unique()->comment('Página pública /c/{slug} o /p/{slug}');
            $table->string('email_contacto', 190)->comment('Avisos de la plataforma. No es un login');
            $table->text('descripcion')->nullable();
            $table->string('banner_url')->nullable();
            $table->enum('estado', ['activa', 'suspendida'])->default('activa')->index();
            $table->foreignId('plan_id')->constrained('planes')->restrictOnDelete();
            $table->date('fecha_alta');
            $table->unsignedSmallInteger('horas_minimas_cancelacion')->default(24);
            $table->unsignedSmallInteger('horas_vencimiento_pendiente')->default(12)->comment('0 = nunca vence');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cuentas');
    }
};
