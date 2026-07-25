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
        // 1. The Catalog
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name'); // "EcoCash"
            $table->string('slug'); // "ecocash"
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 2. The Link (The Transactional Table)
        Schema::create('shift_payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('shift_id')->constrained('shifts')->onDelete('cascade');
            $table->foreignUuid('payment_method_id')->constrained('payment_methods')->onDelete('cascade');
            $table->decimal('amount', 10, 2);
            $table->timestamps();

            // Ensure we don't have duplicate entries for same method in one shift
            $table->unique(['shift_id', 'payment_method_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shift_payments');
    }
};
