<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('stock_variances', function (Blueprint $table) {
            $table->uuid('id')->primary();
            // Removed shop_id as it is redundant via product_id
            $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();

            $table->decimal('variance', 10, 3); // Negative = Shortage, Positive = Overage

            $table->timestamps();
            // Simplified index
            $table->index(['product_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_variances');
    }
};
