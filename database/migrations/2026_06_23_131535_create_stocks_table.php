<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stocks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();
            
            $table->decimal('opening_stock', 10, 3)->default(0.000);
            $table->decimal('stock_added', 10, 3)->default(0.000);
            $table->decimal('expected_stock', 10, 3)->default(0.000); // Opening + Added - Sales - Waste
            $table->decimal('physical_count', 10, 3)->default(0.000);  // Filled by the worker at EOD
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stocks');
    }
};