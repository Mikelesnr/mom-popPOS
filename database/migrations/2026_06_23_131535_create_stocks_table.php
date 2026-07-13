<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('stocks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();

            // The "Live" balance - this is updated in real-time by sales
            $table->decimal('quantity_on_hand', 10, 3)->default(0.000);

            // The "Audit" balance - updated only during a stock take
            $table->decimal('count', 10, 3)->default(0.000);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stocks');
    }
};