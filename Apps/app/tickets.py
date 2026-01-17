from flask import Blueprint, request, jsonify
from datetime import datetime
import psycopg2
import os
import json
from email_service import send_email
from db import get_db_connection
from decorators import admin_required
from extensions import limiter

tickets_bp = Blueprint("tickets", __name__)

@tickets_bp.route("/categories", methods=["GET"])
def get_categories():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT name FROM categories ORDER BY name")
        categories = [r[0] for r in cur.fetchall()]
        cur.close()
        conn.close()
        return jsonify(categories)
    except Exception as e:
        return jsonify([])

@tickets_bp.route("/tickets", methods=["GET"])
@admin_required
def get_all_tickets():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        status = request.args.get('status')
        priority = request.args.get('priority')
        category = request.args.get('category')
        date_from = request.args.get('dateFrom')
        date_to = request.args.get('dateTo')
        assigned_to = request.args.get('assignedTo')
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('pageSize', 10))

        status_mapping = {
            'open': 'Otwarte',
            'in-progress': 'W trakcie',
            'resolved': 'Rozwiązane',
            'cancelled': 'Odrzucone', 
            'closed': 'Zamknięte',
            'new': 'Nowy'
        }
        
        priority_mapping = {
            'critical': 'Krytyczny',
            'high': 'Wysoki',
            'medium': 'Średni',
            'low': 'Niski'
        }

        if status in status_mapping:
            status = status_mapping[status]
            
        if priority in priority_mapping:
            priority = priority_mapping[priority]
        
        query = """
            SELECT t.id, t.title, t.description, t.status, t.priority,
                   u.email as created_by, a.email as assigned_to,
                   c.name as category, tg.name as group_name,
                   t.created_at, t.updated_at, t.group_id,
                   u.first_name, u.last_name,
                   t.creator_email, t.creator_name
            FROM tickets t
            LEFT JOIN users u ON t.user_id = u.id
            LEFT JOIN users a ON t.assigned_to = a.id
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN ticket_groups tg ON t.group_id = tg.id
            WHERE 1=1
        """
        params = []
        
        if status:
            query += " AND t.status = %s"
            params.append(status)
        if priority:
            query += " AND t.priority = %s"
            params.append(priority)
        if category:
            query += " AND c.name = %s"
            params.append(category)
        if assigned_to:
            query += " AND t.assigned_to = %s"
            params.append(assigned_to)
        if date_from:
            query += " AND t.created_at >= %s"
            params.append(date_from)
        if date_to:
            query += " AND t.created_at <= %s::date + INTERVAL '1 day'"
            params.append(date_to)
        
        query += " ORDER BY t.created_at DESC"
        query += f" LIMIT {page_size} OFFSET {(page-1)*page_size}"
        
        cur.execute(query, params)
        tickets = cur.fetchall()
        
        count_query = "SELECT COUNT(*) FROM tickets t LEFT JOIN categories c ON t.category_id = c.id WHERE 1=1"
        count_params = []
        
        if status:
            count_query += " AND t.status = %s"
            count_params.append(status)
        if priority:
            count_query += " AND t.priority = %s"
            count_params.append(priority)
        if category:
            count_query += " AND c.name = %s"
            count_params.append(category)
        if assigned_to:
            count_query += " AND t.assigned_to = %s"
            count_params.append(assigned_to)
        if date_from:
            count_query += " AND t.created_at >= %s"
            count_params.append(date_from)
        if date_to:
            count_query += " AND t.created_at <= %s::date + INTERVAL '1 day'"
            count_params.append(date_to)
        
        cur.execute(count_query, count_params)
        total = cur.fetchone()[0]

        def format_creator(email, first, last, creator_email, creator_name):
            if creator_name:
                return creator_name + (f" ({creator_email})" if creator_email else "")
            if creator_email:
                return creator_email
            if first and last:
                return f"{first} {last}"
            return email or 'System'
        
        tickets_list = [
            {
                'id': t[0],
                'title': t[1],
                'description': t[2],
                'status': t[3],
                'priority': t[4],
                'createdBy': format_creator(t[5], t[12], t[13], t[14], t[15]),
                'assignedTo': t[6],
                'category': t[7],
                'group': t[8],
                'createdDate': t[9].isoformat(),
                'updatedDate': t[10].isoformat() if t[10] else None,
                'groupId': t[11]
            }
            for t in tickets
        ]
        
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Tickety pobrane pomyślnie',
            'data': tickets_list,
            'timestamp': datetime.now().isoformat(),
            'pagination': {
                'total': total,
                'page': page,
                'pageSize': page_size
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@tickets_bp.route("/tickets/<int:ticket_id>", methods=["GET"])
@admin_required
def get_ticket_details(ticket_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT t.id, t.title, t.description, t.status, t.priority,
                   u.email as created_by, a.email as assigned_to,
                   c.name as category, tg.name as group_name,
                   t.created_at, t.updated_at,
                   u.first_name, u.last_name,
                   t.creator_email, t.creator_name
            FROM tickets t
            LEFT JOIN users u ON t.user_id = u.id
            LEFT JOIN users a ON t.assigned_to = a.id
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN ticket_groups tg ON t.group_id = tg.id
            WHERE t.id = %s
        """, (ticket_id,))
        
        ticket = cur.fetchone()
        if not ticket:
            cur.close()
            conn.close()
            return jsonify({'success': False, 'message': 'Ticket nie znaleziony'}), 404
        
        cur.execute("""
            SELECT id, ticket_id, sender_email, sender_name, sender_type, content, attachments, created_at
            FROM ticket_messages
            WHERE ticket_id = %s
            ORDER BY created_at ASC
        """, (ticket_id,))
        
        messages = cur.fetchall()
        messages_list = [
            {
                'id': m[0],
                'ticketId': m[1],
                'senderEmail': m[2],
                'senderName': m[3],
                'senderType': m[4],
                'content': m[5],
                'attachments': json.loads(m[6]) if m[6] else [],
                'createdDate': m[7].isoformat()
            }
            for m in messages
        ]
        
        def format_creator(email, first, last, creator_email, creator_name):
            if creator_name:
                return creator_name + (f" ({creator_email})" if creator_email else "")
            if creator_email:
                return creator_email
            if first and last:
                return f"{first} {last}"
            return email or 'System'

        ticket_data = {
            'id': ticket[0],
            'title': ticket[1],
            'description': ticket[2],
            'status': ticket[3],
            'priority': ticket[4],
            'createdBy': format_creator(ticket[5], ticket[11], ticket[12], ticket[13], ticket[14]),
            'assignedTo': ticket[6],
            'category': ticket[7],
            'group': ticket[8],
            'createdDate': ticket[9].isoformat(),
            'updatedDate': ticket[10].isoformat() if ticket[10] else None,
            'messages': messages_list
        }
        
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Szczegóły ticketa',
            'data': ticket_data,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@tickets_bp.route("/tickets", methods=["POST"])
@limiter.limit("3 per minute")
def create_ticket():
    try:
        data = request.json
        conn = get_db_connection()
        cur = conn.cursor()
        
        email = data.get('email') or data.get('createdBy')
        full_name = data.get('fullName')
        
        email_normalized = email.strip().lower() if email else ''
        if email_normalized:
            domain_part = '@' + email_normalized.split('@')[-1]
            
            cur.execute("SELECT 1 FROM allowed_domains LIMIT 1")
            has_restriction = cur.fetchone()
            
            if has_restriction:
                cur.execute("SELECT 1 FROM allowed_domains WHERE domain = %s", (domain_part,))
                if not cur.fetchone():
                    cur.close()
                    conn.close()
                    return jsonify({'success': False, 'message': f'Domena {domain_part} nie jest uprawniona do zgłaszania incydentów.'}), 403

        user_id = None
        if email:
             cur.execute("SELECT id FROM users WHERE email = %s", (email,))
             user = cur.fetchone()
             user_id = user[0] if user else None
        
        category_map = {
            'hardware': 'Sprzęt',
            'software': 'Oprogramowanie',
            'network': 'Sieć',
            'other': 'Inne',
            'hr': 'HR'
        }
        
        priority_map = {
            'low': 'Niski',
            'medium': 'Średni',
            'high': 'Wysoki',
            'urgent': 'Krytyczny',
            'critical': 'Krytyczny'
        }
        
        cat_input = data.get('category')
        cat_db_name = category_map.get(cat_input)
        
        if not cat_db_name:
            cat_db_name = cat_input
        
        prio_input = data.get('priority')
        prio_db_name = priority_map.get(prio_input, 'Średni')

        cur.execute("SELECT id FROM categories WHERE name = %s", (cat_db_name,))
        category = cur.fetchone()
        category_id = category[0] if category else None
        
        cur.execute("""
            INSERT INTO tickets (title, description, status, priority, user_id, category_id, creator_email, creator_name)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, created_at
        """, (
            data.get('title') or (data.get('description')[:50] + "..." if data.get('description') else "Nowe zgłoszenie"),
            data.get('description'),
            'Nowy',
            prio_db_name,
            user_id,
            category_id,
            email,
            full_name
        ))
        
        ticket = cur.fetchone()
        conn.commit()
        
        if email:
            subject = f"Potwierdzenie zgłoszenia: {data.get('title') or 'Nowe zgłoszenie'} (#{ticket[0]})"
            body = f"""
Witaj {full_name or 'Użytkowniku'},

Twoje zgłoszenie zostało przyjęte do systemu.
ID Zgłoszenia: {ticket[0]}

Tytuł: {data.get('title')}
Opis:
{data.get('description')}

Będziemy Cię informować o postępach.
            """
            send_email([email], subject, body)
            
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Ticket utworzony pomyślnie',
            'data': {
                'id': ticket[0],
                'createdAt': ticket[1].isoformat()
            },
            'timestamp': datetime.now().isoformat()
        }), 201
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@tickets_bp.route("/tickets/<int:ticket_id>", methods=["PUT"])
@admin_required
def update_ticket(ticket_id):
    try:
        data = request.json
        conn = get_db_connection()
        cur = conn.cursor()
        
        update_fields = []
        params = []
        
        if 'status' in data:
            update_fields.append("status = %s")
            params.append(data['status'])
        if 'priority' in data:
            update_fields.append("priority = %s")
            params.append(data['priority'])
        if 'assignedTo' in data:
            assignee = data['assignedTo']
            if assignee is None:
                update_fields.append("assigned_to = %s")
                params.append(None)
            else:
                cur.execute("SELECT id FROM users WHERE email = %s", (assignee,))
                user = cur.fetchone()
                if user:
                    update_fields.append("assigned_to = %s")
                    params.append(user[0])
        if 'title' in data:
            update_fields.append("title = %s")
            params.append(data['title'])
        if 'description' in data:
            update_fields.append("description = %s")
            params.append(data['description'])
        if 'category' in data:
            cur.execute("SELECT id FROM categories WHERE name = %s", (data['category'],))
            cat = cur.fetchone()
            if cat:
                update_fields.append("category_id = %s")
                params.append(cat[0])
        
        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        params.append(ticket_id)
        
        query = f"UPDATE tickets SET {', '.join(update_fields)} WHERE id = %s"
        cur.execute(query, params)
        conn.commit()
        
        if 'status' in data:
            cur.execute("""
                SELECT creator_email, creator_name, title, user_id
                FROM tickets 
                WHERE id = %s
            """, (ticket_id,))
            res = cur.fetchone()
            if res:
                c_email, c_name, t_title, u_id = res
                
                if u_id:
                     cur.execute("SELECT email, first_name FROM users WHERE id = %s", (u_id,))
                     ur = cur.fetchone()
                     if ur:
                         c_email = ur[0]
                         if not c_name: c_name = ur[1]

                if c_email:
                    subject = f"Zmiana statusu zgłoszenia #{ticket_id}: {t_title}"
                    body = f"""
Witaj {c_name or 'Użytkowniku'},

Status Twojego zgłoszenia numer #{ticket_id} został zmieniony na: {data['status']}.

Pozdrawiamy,
Zespół Wsparcia
                    """
                    send_email([c_email], subject, body)

        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Ticket zaktualizowany',
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@admin_required
@tickets_bp.route("/tickets/<int:ticket_id>", methods=["DELETE"])
def delete_ticket(ticket_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("DELETE FROM tickets WHERE id = %s", (ticket_id,))
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Ticket usunięty',
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@admin_required
@tickets_bp.route("/tickets/<int:ticket_id>/messages", methods=["GET"])
def get_ticket_messages(ticket_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT id, ticket_id, sender_email, sender_name, sender_type, content, attachments, created_at
            FROM ticket_messages
            WHERE ticket_id = %s
            ORDER BY created_at ASC
        """, (ticket_id,))
        
        messages = cur.fetchall()
        messages_list = [
            {
                'id': m[0],
                'ticketId': m[1],
                'senderEmail': m[2],
                'senderName': m[3],
                'senderType': m[4],
                'content': m[5],
                'attachments': json.loads(m[6]) if m[6] else [],
                'createdDate': m[7].isoformat()
            }
            for m in messages
        ]
        
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Wiadomości pobrane',
            'data': messages_list,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@tickets_bp.route("/tickets/<int:ticket_id>/messages", methods=["POST"])
@admin_required
def send_ticket_message(ticket_id):
    try:
        data = request.json
        conn = get_db_connection()
        cur = conn.cursor()
        
        sender_id = None
        if 'senderEmail' in data:
            cur.execute("SELECT id FROM users WHERE email = %s", (data['senderEmail'],))
            user = cur.fetchone()
            sender_id = user[0] if user else None
        
        attachments_json = json.dumps(data.get('attachments', []))
        reply_to_group = data.get('replyToGroup', False)
        if isinstance(reply_to_group, str):
            reply_to_group = reply_to_group.lower() in ('true', '1', 'yes')
        
        target_ticket_ids = {ticket_id}
        
        cur.execute("SELECT group_id, title FROM tickets WHERE id = %s", (ticket_id,))
        ticket_info = cur.fetchone()
        group_id = ticket_info[0] if ticket_info else None
        ticket_title = ticket_info[1] if ticket_info else "Zgłoszenie"
        
        if not group_id:
            cur.execute("SELECT group_id FROM ticket_group_members WHERE ticket_id = %s", (ticket_id,))
            res = cur.fetchone()
            if res:
                group_id = res[0]

        if reply_to_group and group_id:
            cur.execute("SELECT id FROM tickets WHERE group_id = %s", (group_id,))
            others = cur.fetchall()
            for row in others:
                target_ticket_ids.add(row[0])
            
            cur.execute("SELECT ticket_id FROM ticket_group_members WHERE group_id = %s", (group_id,))
            others_members = cur.fetchall()
            for row in others_members:
                target_ticket_ids.add(row[0])
        
        primary_msg_id = None
        primary_msg_created_at = None
        
        emails_to_send = []
        
        for t_id in target_ticket_ids:
            cur.execute("""
                INSERT INTO ticket_messages 
                (ticket_id, sender_id, sender_email, sender_name, sender_type, content, attachments)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id, created_at
            """, (
                t_id,
                sender_id,
                data.get('senderEmail'),
                data.get('senderName'),
                data.get('senderType', 'user'),
                data.get('content'),
                attachments_json
            ))
            
            msg = cur.fetchone()
            if t_id == ticket_id:
                primary_msg_id = msg[0]
                primary_msg_created_at = msg[1]
                
            cur.execute("UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = %s", (t_id,))
            
            cur.execute("""
                SELECT u.email, t.creator_email, t.title 
                FROM tickets t 
                LEFT JOIN users u ON t.user_id = u.id 
                WHERE t.id = %s
            """, (t_id,))
            row = cur.fetchone()
            if row:
                u_email, c_email, t_title = row
                recipient_email = u_email if u_email else c_email
                
                if recipient_email and recipient_email != data.get('senderEmail'):
                     emails_to_send.append({
                         'email': recipient_email,
                         'ticket_id': t_id,
                         'title': t_title
                     })
            
        conn.commit()
        
        try:
            for item in emails_to_send:
                subject = f"Aktualizacja zgłoszenia: {item['title']} (#{item['ticket_id']})"
                if reply_to_group:
                     subject += " [Wiadomość Grupowa]"
                
                content = f"""
Witaj,

Pojawiła się nowa wiadomość w zgłoszeniu #{item['ticket_id']}.

Od: {data.get('senderName', 'System')}
Treść:
{data.get('content')}

--------------------------------------------------
To jest wiadomość automatyczna.
                """
                send_email([item['email']], subject, content)
                    
        except Exception as e:
            print(f"Błąd wysyłania emaila: {e}")
        
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Wiadomość wysłana',
            'data': {
                'id': primary_msg_id,
                'createdAt': primary_msg_created_at.isoformat() if primary_msg_created_at else datetime.now().isoformat()
            },
            'timestamp': datetime.now().isoformat()
        }), 201
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@tickets_bp.route("/ticket-groups", methods=["GET"])
@admin_required
def get_ticket_groups():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT id, name, description, created_by, created_at
            FROM ticket_groups
            ORDER BY created_at DESC
        """)
        
        groups = cur.fetchall()
        groups_list = [
            {
                'id': g[0],
                'name': g[1],
                'description': g[2],
                'createdBy': g[3],
                'createdAt': g[4].isoformat()
            }
            for g in groups
        ]
        
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Grupy pobrane',
            'data': groups_list,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@admin_required
@tickets_bp.route("/ticket-groups", methods=["POST"])
def create_ticket_group():
    try:
        data = request.json
        conn = get_db_connection()
        cur = conn.cursor()
        
        user_id = None
        if 'createdBy' in data:
            cur.execute("SELECT id FROM users WHERE email = %s", (data['createdBy'],))
            user = cur.fetchone()
            user_id = user[0] if user else None
        
        cur.execute("""
            INSERT INTO ticket_groups (name, description, created_by)
            VALUES (%s, %s, %s)
            RETURNING id, created_at
        """, (data.get('name'), data.get('description'), user_id))
        
        group = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Grupa utworzona',
            'data': {
                'id': group[0],
                'createdAt': group[1].isoformat()
            },
            'timestamp': datetime.now().isoformat()
        }), 201
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@tickets_bp.route("/ticket-groups/<int:group_id>", methods=["DELETE"])
def delete_ticket_group(group_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("UPDATE tickets SET group_id = NULL WHERE group_id = %s", (group_id,))
        
        cur.execute("DELETE FROM ticket_group_members WHERE group_id = %s", (group_id,))
        
        cur.execute("DELETE FROM ticket_groups WHERE id = %s", (group_id,))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Grupa usunięta',
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@tickets_bp.route("/ticket-groups/<int:group_id>/tickets/<int:ticket_id>", methods=["POST"])
def add_ticket_to_group(group_id, ticket_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            INSERT INTO ticket_group_members (group_id, ticket_id)
            VALUES (%s, %s)
            ON CONFLICT DO NOTHING
        """, (group_id, ticket_id))

        cur.execute("""
            UPDATE tickets
            SET group_id = %s
            WHERE id = %s
        """, (group_id, ticket_id))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Ticket dodany do grupy',
            'timestamp': datetime.now().isoformat()
        }), 201
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@tickets_bp.route("/ticket-groups/<int:group_id>/tickets/<int:ticket_id>", methods=["DELETE"])
def remove_ticket_from_group(group_id, ticket_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            DELETE FROM ticket_group_members
            WHERE group_id = %s AND ticket_id = %s
        """, (group_id, ticket_id))

        cur.execute("""
            UPDATE tickets
            SET group_id = NULL
            WHERE id = %s AND group_id = %s
        """, (ticket_id, group_id))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Ticket usunięty z grupy',
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@tickets_bp.route("/analytics/statistics", methods=["GET"])
def get_statistics():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Nowy' THEN 1 ELSE 0 END) as new,
                SUM(CASE WHEN status = 'Otwarte' THEN 1 ELSE 0 END) as open,
                SUM(CASE WHEN status = 'W trakcie' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'Zamknięte' THEN 1 ELSE 0 END) as closed,
                SUM(CASE WHEN priority = 'Krytyczny' THEN 1 ELSE 0 END) as critical,
                SUM(CASE WHEN priority = 'Wysoki' THEN 1 ELSE 0 END) as high
            FROM tickets
        """)
        
        stats = cur.fetchone()
        
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Statystyki pobrane',
            'data': {
                'totalTickets': stats[0] or 0,
                'newTickets': stats[1] or 0,
                'openTickets': stats[2] or 0,
                'inProgressTickets': stats[3] or 0,
                'closedTickets': stats[4] or 0,
                'criticalPriority': stats[5] or 0,
                'highPriority': stats[6] or 0
            },
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500