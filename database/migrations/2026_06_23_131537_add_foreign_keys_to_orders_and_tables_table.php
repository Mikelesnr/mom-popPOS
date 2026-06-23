<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->foreign('table_id')->references('id')->on('tables')->nullOnDelete();
        });

        Schema::table('tables', function (Blueprint $table) {
            $table->foreign('current_order_id')->references('id')->on('orders')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['table_id']);
        });

        Schema::table('tables', function (Blueprint $table) {
            $table->dropForeign(['current_order_id']);
        });
    }
};