<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('waste_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('shift_id')->constrained('shifts');
            $table->foreignUuid('product_id')->constrained('products');
            $table->foreignUuid('user_id')->constrained('users');
            $table->decimal('quantity', 10, 3); // Handles kitchen write-offs or partial breaks cleanly
            $table->text('reason');
            $table->string('metadata');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('waste_logs');
    }
};