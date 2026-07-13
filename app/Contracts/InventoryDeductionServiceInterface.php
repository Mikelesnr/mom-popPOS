<?php

namespace App\Contracts;

use App\Models\OrderItem;

interface InventoryDeductionServiceInterface
{
    /**
     * Deducts stock based on the order item and sale type.
     */
    public function deduct(OrderItem $item, string $saleType): void;
}