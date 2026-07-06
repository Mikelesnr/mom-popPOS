<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('units', function (Blueprint $table) {
            $table->uuid('id')->primary();
            
            $table->string('name'); // e.g., 'Box', 'Pack', 'Single'
            $table->decimal('conversion_rate', 10, 3); // Supports fractional conversions
            
            $table->timestamps();

        });
    }

    public function down(): void
    {
        Schema::dropIfExists('units');
    }
};
