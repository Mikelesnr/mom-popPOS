<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('shop_id')->constrained('shops')->cascadeOnDelete();
            $table->string('name'); // e.g., 'Beers', 'Ciders', 'Steaks', 'Desserts'
            $table->string('slug'); // Helpful for rapid frontend grouping keys
            $table->timestamps();

            // Ensure category names are unique per shop storefront
            $table->unique(['shop_id', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};