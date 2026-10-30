from flask import Blueprint, request, jsonify
from database import execute_query

memory_bp = Blueprint('memory', __name__)

@memory_bp.route('', methods=['POST'])
def add_memory_item():
    """POST /api/memory - Add a new memory item for a patient"""
    data = request.get_json() or {}
    patient_id = data.get('patient_id')
    title = data.get('title', '').strip()
    category = data.get('category', 'Note').strip() # 'Family', 'Routine', 'Place', 'Note'
    description = data.get('description', '').strip()

    if not patient_id or not title or not description:
        return jsonify({'error': 'patient_id, title, and description are required.'}), 400

    try:
        item_id = execute_query(
            '''INSERT INTO memory_items (patient_id, title, category, description)
               VALUES (%s, %s, %s, %s)''',
            (patient_id, title, category, description),
            commit=True
        )
        return jsonify({'message': 'Memory item added successfully.', 'id': item_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@memory_bp.route('/<int:patient_id>', methods=['GET'])
def get_memory_items(patient_id):
    """GET /api/memory/<patient_id> - Retrieve memory items for patient"""
    try:
        items = execute_query(
            'SELECT * FROM memory_items WHERE patient_id = %s ORDER BY id DESC',
            (patient_id,), fetchall=True
        )
        return jsonify(items), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@memory_bp.route('/<int:item_id>', methods=['PUT'])
def update_memory_item(item_id):
    """PUT /api/memory/<id> - Update a memory item"""
    data = request.get_json() or {}
    title = data.get('title')
    category = data.get('category')
    description = data.get('description')

    try:
        existing = execute_query('SELECT * FROM memory_items WHERE id = %s', (item_id,), fetchone=True)
        if not existing:
            return jsonify({'error': 'Memory item not found.'}), 404

        new_title = title if title is not None else existing['title']
        new_cat = category if category is not None else existing['category']
        new_desc = description if description is not None else existing['description']

        execute_query(
            'UPDATE memory_items SET title=%s, category=%s, description=%s WHERE id=%s',
            (new_title, new_cat, new_desc, item_id),
            commit=True
        )
        return jsonify({'message': 'Memory item updated successfully.'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@memory_bp.route('/<int:item_id>', methods=['DELETE'])
def delete_memory_item(item_id):
    """DELETE /api/memory/<id> - Delete a memory item"""
    try:
        execute_query('DELETE FROM memory_items WHERE id = %s', (item_id,), commit=True)
        return jsonify({'message': 'Memory item deleted successfully.'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
