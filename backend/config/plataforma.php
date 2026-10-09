<?php

/*
 * Datos iniciales de la plataforma. Los usa el seeder del administrador
 * la primera vez que se crea la base (make up / make fresh).
 * Los valores reales van en .env: nunca se escriben acá.
 */
return [

    'admin' => [
        'nombre' => env('PLATAFORMA_ADMIN_NOMBRE', 'Administrador'),
        'email' => env('PLATAFORMA_ADMIN_EMAIL'),
        'dni' => env('PLATAFORMA_ADMIN_DNI'),
        // Vacío = el seeder genera una contraseña aleatoria y la muestra una sola vez.
        'password' => env('PLATAFORMA_ADMIN_PASSWORD'),
    ],

];
