<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuidMorphs('orderable'); // creates orderable_id + orderable_type
            $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();
            $table->string('name')->nullable();
            $table->string('metadata');
            $table->decimal('quantity', 10, 3);
            $table->decimal('unit_price', 10, 2);
            $table->decimal('subtotal', 10, 2);
            $table->timestamps();
        });

    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};