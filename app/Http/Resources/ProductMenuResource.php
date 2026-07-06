<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductMenuResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'name'          => $this->name,
            'cost_price'    => $this->cost_price,
            'selling_price' => $this->selling_price,
            'is_perishable' => $this->is_perishable,
            'unit'          => [
                'id'              => $this->unit?->id,
                'name'            => $this->unit?->name,
                'conversion_rate' => $this->unit?->conversion_rate,
            ],
            'bottle_specs'  => $this->bottle ? [
                'is_weighable'         => $this->bottle->is_weighable,
                'capacity_ml'          => $this->bottle->capacity_ml,
                'tare_weight_g'        => $this->bottle->tare_weight_g,
                'gross_weight_g'       => $this->bottle->gross_weight_g,
                'bottle_selling_price' => $this->bottle->bottle_selling_price,
            ] : null,
        ];
    }
}
