<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Planes de membresía que se ofrecen a las cuentas.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('planes', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 80);
            $table->decimal('precio_mensual', 12, 2)->default(0)->comment('ARS. 0 = sin cargo');
            $table->text('descripcion')->nullable();
            $table->unsignedSmallInteger('max_profesionales')->default(0)->comment('0 = sin límite');
            $table->boolean('activo')->default(true)->comment('Inactivo = no se ofrece a cuentas nuevas');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('planes');
    }
};
