<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('units', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('name'); // e.g., 'Box', 'Pack', 'Single'
            $table->decimal('conversion_rate', 10, 3);

            // Using 'unit' and 'bottle' as the clear domain terminology
            $table->string('type')->default('unit');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('units');
    }
};