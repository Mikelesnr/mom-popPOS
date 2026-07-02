<?php

use App\Enums\ExpenseType;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('shop_id')->constrained('shops')->cascadeOnDelete();
            
            $table->string('name'); 
            $table->decimal('amount', 10, 2);
            
            // Plugs the Enum cases directly into the native database constraint
            $table->enum('type', ExpenseType::values());
            
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->index(['shop_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};