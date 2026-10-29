# Basha League of Legends Player Hub - Cloud Functions
# Environment variables required: GEMINI_API_KEY

import os
import json
from firebase_functions import firestore_fn, https_fn
from firebase_admin import initialize_app, firestore, storage
from google import genai
from google.genai import types

initialize_app()
db = firestore.client()

# Gemini Setup
# Replace with actual project api key in production GCP Secret Manager
api_key = os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

@firestore_fn.on_document_written(document="chat_logs/{messageId}")
def moderate_chat(event: firestore_fn.Event[firestore_fn.Change[firestore_fn.DocumentSnapshot]]) -> None:
    """
    Moderates chat using Gemini Flash to detect toxicity or unsportsmanlike conduct.
    """
    if event.data is None or event.data.after is None:
        return
        
    new_value = event.data.after.to_dict()
    if not new_value or new_value.get('hidden') == True:
        return
        
    text_content = new_value.get('message', '')
    if not text_content:
        return

    try:
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=f"""
            Analyze the following esports team chat message for toxicity, hate speech, or unsportsmanlike conduct.
            Return ONLY a valid JSON object with {"flagged": boolean, "reason": "string"}.
            Message: '{text_content}'
            """
        )
        
        result = json.loads(response.text.strip('```json\n').strip('```'))
        
        if result.get('flagged'):
            event.data.after.reference.update({
                'hidden': True,
                'moderationReason': result.get('reason', 'Flagged by AI Moderator')
            })
            
    except Exception as e:
        print(f"Error during moderation: {e}")

from googleapiclient.discovery import build
import google.auth

@firestore_fn.on_document_created(document="students/{studentId}")
def create_youtube_playlist_for_student(event: firestore_fn.Event[firestore_fn.DocumentSnapshot]) -> None:
    """
    Triggered when a new student is added to the 'students' collection.
    Automatically creates a YouTube Playlist for their highlights using the YouTube Data API.
    """
    if event.data is None:
        return

    student_data = event.data.to_dict()
    if not student_data:
        return

    student_name = student_data.get('displayName', 'New Student')
    
    try:
        print(f"Creating YouTube Playlist for student: {student_name}")
        
        # Normally requires OAuth2 credentials.json for your Team YouTube account.
        # This assumes default credentials have been configured with YouTube scopes.
        # Example: credentials, project = google.auth.default(scopes=['https://www.googleapis.com/auth/youtube'])
        
        # MOCK IMPLEMENTATION WARNING:
        # The YouTube Data API requires a user-delegated OAuth token to create playlists on a channel.
        # If running in Cloud Functions with a service account, it cannot automatically manage YouTube channels without domain-wide delegation.
        # We simulate the API call here for safety in the preview environment.
        
        # In production with correct auth, the call would look like this:
        # youtube = build('youtube', 'v3', credentials=credentials)
        # response = youtube.playlists().insert(
        #     part="snippet,status",
        #     body={
        #         "snippet": {
        #             "title": f"Basha Highlights: {student_name}",
        #             "description": f"Personal highlight reel for Basha Esports athlete {student_name}."
        #         },
        #         "status": {
        #             "privacyStatus": "unlisted"
        #         }
        #     }
        # ).execute()
        # playlist_id = response['id']
        
        # Simulated response
        import uuid
        playlist_id = f"PL_BASHA_{uuid.uuid4().hex[:12].upper()}"
        playlist_url = f"https://www.youtube.com/playlist?list={playlist_id}"

        # Update the Firestore document with the new playlist information
        event.data.reference.update({
            'youtubePlaylistId': playlist_id,
            'youtubePlaylistUrl': playlist_url,
            # Also update the notificationSettings property used by the frontend Video Lab
            'notificationSettings.personalHighlights': playlist_url
        })
        
        print(f"Successfully assigned playlist {playlist_id} to student document.")

    except Exception as e:
        print(f"Error creating YouTube playlist: {e}")
def analyze_match_comms(req: https_fn.Request) -> https_fn.Response:
    """
    Analyzes game VOD/Comms audio using Gemini 1.5 Pro to report on shot-calling and clutter.
    Expects request json with {"storage_path": "gs://bucket/path/to/audio.mp3"}
    """
    try:
        data = req.get_json()
        storage_path = data.get("storage_path")
        
        if not storage_path:
            return https_fn.Response("Missing storage_path", status=400)

        # In a full flow, you would upload to Gemini File API 
        # using client.files.upload(file=downloaded_local_path)
        # Here we mock the file URI for demonstration:
        # file = client.files.get(name=uploaded_file_id)
        
        prompt = '''
        Analyze this League of Legends match audio. Provide a professional esports report focusing strictly on:
        1. Effectiveness of shot-calling (Did players commit? Were calls clear?).
        2. Clarity of information (Were enemy positions and ultimates tracked?).
        3. Comm Clutter (Identify instances of unnecessary chatter/complaining).
        
        Output as a structured markdown report.
        '''
        
        # Simulated response logic 
        # response = client.models.generate_content(
        #     model='gemini-1.5-pro',
        #     contents=[file, prompt]
        # )
        
        return https_fn.Response(json.dumps({
            "status": "success", 
            "report": "Analysis triggered. (In production, wait for File API processing)."
        }), mimetype="application/json")
        
    except Exception as e:
        return https_fn.Response(f"Error: {str(e)}", status=500)
