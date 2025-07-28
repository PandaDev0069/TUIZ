# This is a file containing the main points given to ai 

## Main Points of this app
- This is a Quiz app hosted on
    - DB: Supabase
    - Backend: Render
    - Frontend: Vercel
- This app needs to be light and fast for hosting 200~300 concurent players in a game session
- Everything should be free including the hosting.
- Solutions for reducing latency
    - Use web-sockets for communication
    - Use Less queries in between db and backend to keep things light
    - Store game states in memory/sessio-storage
    - Sync between the db and backend will be done in background when scores are being shown or explanation screen is on
- Quiz will be held like this:
    - Host menu
        - From dashboard Selects a question-set and presses (Create-Game) Button
        - A game session is created
        - Host is redirected to /host Where the Session code is generated and shown
    - Player menu
        - If the player is a guest a guest session is generated
        - player is redirected to /join menu
        - player chooses/enters their name and session join code