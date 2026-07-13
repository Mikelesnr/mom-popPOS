<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Unit;
use Illuminate\Http\Request;

class UnitController extends Controller
{
    public function index()
    {
        return Unit::all();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'type' => 'required|in:unit,bottle'
        ]);
        return Unit::create($data);
    }

    public function update(Request $request, Unit $unit)
    {
        $data = $request->validate([
            'name' => 'string',
            'type' => 'in:unit,bottle'
        ]);
        $unit->update($data);
        return $unit;
    }

    public function destroy(Unit $unit)
    {
        $unit->delete();
        return response()->noContent();
    }
}