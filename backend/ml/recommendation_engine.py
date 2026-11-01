"""
MindCare AI - Personalized Recommendation & Performance Profile Engine
Calculates individualized activity priorities, personalized difficulties, performance trends,
and Random Forest ML classifications for each patient based on their actual session history.
"""

from database import execute_query
from ml.predict import predict_performance, map_difficulty_to_numeric, map_numeric_to_difficulty

_CACHED_ACTIVITIES = None

def get_all_activities():
    global _CACHED_ACTIVITIES
    if _CACHED_ACTIVITIES is None:
        _CACHED_ACTIVITIES = execute_query('SELECT * FROM activities ORDER BY id ASC', fetchall=True) or []
    return _CACHED_ACTIVITIES

def get_patient_performance_profile(patient_id):
    """
    Calculates comprehensive per-patient and per-activity performance metrics.
    Returns:
      dict with patient_id, stage, total_sessions, overall_accuracy, overall_score,
      recent_trend, strengths, needs_practice, and per-activity performance details.
    """
    # 1. Fetch all standard activities (cached in memory)
    activities = get_all_activities()
    
    # 2. Fetch all completed sessions for this patient ordered by created_at DESC
    query = '''
        SELECT s.*, a.name as activity_name 
        FROM activity_sessions s
        JOIN activities a ON s.activity_id = a.id
        WHERE s.patient_id = %s
        ORDER BY s.created_at DESC
    '''
    sessions = execute_query(query, (patient_id,), fetchall=True) or []
    
    total_sessions = len(sessions)
    stage = "Initial Baseline Stage" if total_sessions < 3 else "Personalized Stage"
    
    overall_accuracy = round(sum(s['accuracy'] for s in sessions) / total_sessions, 1) if total_sessions > 0 else 0.0
    overall_score = round(sum(s['score'] for s in sessions) / total_sessions, 1) if total_sessions > 0 else 0.0
    
    # Group sessions by activity_id
    sessions_by_activity = {}
    for act in activities:
        sessions_by_activity[act['id']] = []
        
    for s in sessions:
        act_id = s['activity_id']
        if act_id in sessions_by_activity:
            sessions_by_activity[act_id].append(s)
            
    recent_activity_order = [s['activity_id'] for s in sessions[:5]] # Top 5 recent activity IDs
    
    activity_profiles = []
    strengths = []
    needs_practice = []
    
    for act in activities:
        act_id = act['id']
        act_sessions = sessions_by_activity[act_id]
        count = len(act_sessions)
        
        if count == 0:
            avg_acc = 0.0
            recent_acc = 0.0
            avg_score = 0
            avg_mistakes = 0.0
            recent_mistakes = 0.0
            avg_time = 0
            trend = "new"
            rec_level = "Easy"
            last_difficulty = "Easy"
        else:
            avg_acc = round(sum(s['accuracy'] for s in act_sessions) / count, 1)
            avg_score = int(sum(s['score'] for s in act_sessions) / count)
            avg_mistakes = round(sum(s['mistakes'] for s in act_sessions) / count, 1)
            avg_time = int(sum(s['completion_time'] for s in act_sessions) / count)
            last_difficulty = act_sessions[0]['difficulty'] # Most recent session difficulty
            
            # Calculate recent weighted accuracy (give 70% weight to last 3 sessions, 30% to older)
            if count == 1:
                recent_acc = avg_acc
                recent_mistakes = avg_mistakes
            elif count <= 3:
                recent_acc = round(sum(s['accuracy'] for s in act_sessions[:2]) / len(act_sessions[:2]), 1)
                recent_mistakes = round(sum(s['mistakes'] for s in act_sessions[:2]) / len(act_sessions[:2]), 1)
            else:
                recent_top = sum(s['accuracy'] for s in act_sessions[:3]) / 3
                older = sum(s['accuracy'] for s in act_sessions[3:]) / len(act_sessions[3:])
                recent_acc = round(recent_top * 0.7 + older * 0.3, 1)
                recent_mistakes = round((sum(s['mistakes'] for s in act_sessions[:3]) / 3) * 0.7 + 
                                       (sum(s['mistakes'] for s in act_sessions[3:]) / len(act_sessions[3:])) * 0.3, 1)
                
            # Trend calculation
            if recent_acc >= avg_acc + 3.0:
                trend = "improving"
            elif recent_acc <= avg_acc - 5.0:
                trend = "declining"
            else:
                trend = "stable"
                
            # Personalized difficulty progression for this specific activity
            last_diff_num = map_difficulty_to_numeric(last_difficulty)
            if recent_acc >= 85.0 and recent_mistakes <= 1.5:
                rec_diff_num = min(3, last_diff_num + 1)
            elif recent_acc < 60.0 or recent_mistakes >= 4.0:
                rec_diff_num = max(1, last_diff_num - 1)
            else:
                rec_diff_num = last_diff_num
            rec_level = map_numeric_to_difficulty(rec_diff_num)
            
            # Categorize into Strengths vs Needs Practice
            if recent_acc >= 80.0:
                strengths.append(act['name'])
            elif recent_acc < 65.0 or trend == "declining":
                needs_practice.append(act['name'])

        activity_profiles.append({
            'activity_id': act_id,
            'activity_name': act['name'],
            'description': act['description'],
            'total_attempts': count,
            'average_accuracy': avg_acc,
            'recent_accuracy': recent_acc,
            'average_score': avg_score,
            'average_mistakes': avg_mistakes,
            'recent_mistakes': recent_mistakes,
            'average_completion_time': avg_time,
            'trend': trend,
            'last_difficulty': last_difficulty,
            'recommended_level': rec_level
        })
        
    # Overall Recent Trend calculation across all recent sessions
    if total_sessions >= 3:
        top3_acc = sum(s['accuracy'] for s in sessions[:3]) / 3
        older_acc = sum(s['accuracy'] for s in sessions[3:]) / len(sessions[3:]) if len(sessions) > 3 else top3_acc
        if top3_acc >= older_acc + 3.0:
            recent_trend = "improving"
        elif top3_acc <= older_acc - 5.0:
            recent_trend = "declining"
        else:
            recent_trend = "stable"
    else:
        recent_trend = "baseline"

    return {
        'patient_id': patient_id,
        'stage': stage,
        'total_sessions': total_sessions,
        'overall_accuracy': overall_accuracy,
        'overall_score': overall_score,
        'recent_trend': recent_trend,
        'strengths': strengths,
        'needs_practice': needs_practice,
        'activities': activity_profiles,
        'recent_activity_ids': recent_activity_order
    }


def generate_recommendation_for_patient(patient_id):
    """
    Computes a fully personalized activity recommendation for patient_id.
    Prevents random assignments, enforces individual performance scoring,
    and returns friendly + clinical reasons.
    """
    profile = get_patient_performance_profile(patient_id)
    stage = profile['stage']
    activities_profile = profile['activities']
    recent_activity_ids = profile['recent_activity_ids']
    
    # -------------------------------------------------------------------
    # STAGE 1: Baseline Stage (Completed < 3 sessions)
    # -------------------------------------------------------------------
    if stage == "Initial Baseline Stage":
        # Select unplayed activities first, or the activity with lowest attempts
        unplayed = [a for a in activities_profile if a['total_attempts'] == 0]
        if unplayed:
            target_act = unplayed[0]
        else:
            target_act = sorted(activities_profile, key=lambda x: x['total_attempts'])[0]
            
        activity_id = target_act['activity_id']
        activity_name = target_act['activity_name']
        recommended_difficulty = "Easy"
        performance_category = "Normal Progress"
        rec_score = 50.0
        
        patient_reason = f"Welcome! Let's start with {activity_name} to explore your memory strengths."
        caregiver_reason = f"Patient completed {profile['total_sessions']} sessions. System is in the initial baseline evaluation stage to build patient profile."
        
    # -------------------------------------------------------------------
    # STAGE 2: Personalized Recommendation Stage (>= 3 sessions)
    # -------------------------------------------------------------------
    else:
        scored_activities = []
        for act in activities_profile:
            rec_acc = act['recent_accuracy']
            attempts = act['total_attempts']
            trend = act['trend']
            act_id = act['activity_id']
            
            # 1. Weakness Score (Lower accuracy = higher practice priority)
            weakness_score = max(0.0, (100.0 - rec_acc) * 1.5)
            
            # 2. Declining Trend Bonus (If patient accuracy dropped recently)
            declining_bonus = 25.0 if trend == "declining" else 0.0
            
            # 3. Unplayed / Low Attempt Boost
            unplayed_boost = 30.0 if attempts == 0 else (15.0 if attempts < 2 else 0.0)
            
            # 4. Variety / Recency Penalty (Avoid repeating exact same activity back-to-back)
            recency_penalty = 0.0
            if recent_activity_ids:
                if recent_activity_ids[0] == act_id:
                    recency_penalty = 40.0 # Most recently played
                elif len(recent_activity_ids) > 1 and recent_activity_ids[1] == act_id:
                    recency_penalty = 20.0 # Played 2nd most recently
                    
            rec_score = round(weakness_score + declining_bonus + unplayed_boost - recency_penalty, 2)
            
            scored_activities.append({
                'profile': act,
                'rec_score': rec_score
            })
            
        # Sort by recommendation priority score descending
        scored_activities.sort(key=lambda x: x['rec_score'], reverse=True)
        top_selection = scored_activities[0]
        target_act = top_selection['profile']
        rec_score = top_selection['rec_score']
        
        activity_id = target_act['activity_id']
        activity_name = target_act['activity_name']
        recommended_difficulty = target_act['recommended_level']
        
        # Run Random Forest classifier on recent performance metrics
        performance_category = predict_performance(
            accuracy=target_act['recent_accuracy'] if target_act['total_attempts'] > 0 else 75.0,
            score=target_act['average_score'] if target_act['total_attempts'] > 0 else 70,
            completion_time=target_act['average_completion_time'] if target_act['total_attempts'] > 0 else 45,
            mistakes=target_act['recent_mistakes'] if target_act['total_attempts'] > 0 else 1,
            attempts=1,
            difficulty=recommended_difficulty
        )
        
        # Build tailored Patient-Friendly and Caregiver Reasons
        if target_act['trend'] == "declining" or target_act['recent_accuracy'] < 60.0:
            patient_reason = f"Let's practice {activity_name} today to help strengthen your recall in this area."
            caregiver_reason = f"{activity_name} recent accuracy is {target_act['recent_accuracy']}% (declining trend, avg mistakes {target_act['recent_mistakes']}). Priority practice recommended at {recommended_difficulty} level."
        elif target_act['recent_accuracy'] >= 85.0:
            patient_reason = f"Great progress on {activity_name}! You're ready to try the {recommended_difficulty} challenge today."
            caregiver_reason = f"{activity_name} performance is strong ({target_act['recent_accuracy']}% accuracy). Progressing challenge level to {recommended_difficulty}."
        elif target_act['total_attempts'] == 0:
            patient_reason = f"Let's try a fresh exercise: {activity_name} to broaden your cognitive practice."
            caregiver_reason = f"Unplayed activity {activity_name} selected to ensure balanced cognitive domain coverage."
        else:
            patient_reason = f"Ready to exercise your brain with {activity_name} today?"
            caregiver_reason = f"Personalized selection: {activity_name} ({target_act['recent_accuracy']}% accuracy, {target_act['trend']} trend) recommended at {recommended_difficulty} level."

    # -------------------------------------------------------------------
    # Persist Recommendation to Database
    # -------------------------------------------------------------------
    rec_id = execute_query(
        '''INSERT INTO recommendations 
           (patient_id, activity_id, performance_category, recommended_difficulty, recommendation_reason, caregiver_reason, score, stage)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s)''',
        (patient_id, activity_id, performance_category, recommended_difficulty, patient_reason, caregiver_reason, rec_score, stage),
        commit=True
    )
    
    return {
        'id': rec_id,
        'patient_id': patient_id,
        'activity_id': activity_id,
        'activity_name': activity_name,
        'performance_category': performance_category,
        'recommended_difficulty': recommended_difficulty,
        'recommendation_reason': patient_reason,
        'caregiver_reason': caregiver_reason,
        'score': rec_score,
        'stage': stage
    }
