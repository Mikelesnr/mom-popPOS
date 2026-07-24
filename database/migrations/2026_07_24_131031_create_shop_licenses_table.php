<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('shop_licenses', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // One license row per shop - you update it in place when they pay
            $table->foreignUuid('shop_id')->unique()->constrained('shops')->cascadeOnDelete();

            $table->date('paid_date');
            $table->unsignedInteger('duration_days')->default(30);

            // Manual override switch - separate from the date math on purpose,
            // so you can kill/extend access without touching paid_date/duration
            $table->boolean('paid_status')->default(true);

            $table->float('rate')->nullable();

            $table->float('amount_paid')->nullable();

            $table->text('notes')->nullable(); // e.g. "paid via ecocash, ref #123"

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shop_licenses');
    }
};
