<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shot_sizes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('shop_id')->constrained('shops')->cascadeOnDelete();
            $table->string('name'); // e.g., 'Single Pour'
            $table->integer('size_ml');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shot_sizes');
    }
};