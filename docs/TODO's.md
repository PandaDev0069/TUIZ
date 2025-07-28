# This is the TODO file created by developr to update the development todo's for this app.
# New and updated Todo list

## Quiz creation page

- ### meta data creator page
    - (✅)set proper paths for the thumbnail upload
    - (✅)clean the ui
    - (✅)after completing the metadata section for the quiz creation proceed to quesiton creation page
    - (✅)Fix delete button color (currently white and cannot be seen until hoverd which shows a shadow ) for the thumbnatil(and fix the aspect ratio)(same for question-image too)
    - (✅)file saving
- ### questtion creation page
    - (✅)properly check the reuired fields from the database schema 
    - (✅)clean the ui 
    - (✅)setup the proper backend paths for the image uploads
    - (✅)properly store the question order 
    - (✅)properly implement Rest of the meta data
    - (✅)add field to add the explanation page(comprehensive explanation system with title, text, and image support via modal)
    - (✅)Shift the overall position of explantion modal to upward.
    - (✅)Fix the button flex in the explantion modal
    - (✅)Fix the image upload in the explanation modal
    - (✅)Backend integration for questions and answers creation
    - (✅)Real-time auto-save functionality for questions
    - (✅)Progressive saving with save status indicators
    - (✅)after all required fields are filled proceed to the settings section
- ### quiz-settings
    - (✅)clean the ui and remove the un-necessary fields that are not in the db
    - (✅)update the re-ordring modal to work for the new db
    - (✅)use proper meta's(inbetween explanation enabled, etc) save that in settings json in the db
    - (✅)procedd to the final confirmation page
- ### confirmation page
    - preview as host
    - preview as player
    - final confirmation of question order(use same modal as settings)
    - (✅)when everything is confirmed save to db(in beteween the changes give(一時保存) button to save everything for that time if quiz-creation  couldn't be completed at that time)

## Actual quiz page

### Host View
- #### Quiz start page
    - 
- #### Quiz control page
    -  
- #### InBetween explanation & rankings/scores page
    - 
- #### Final scores page
    - 
- #### END screen with stats
    - 
### player view
- #### Join code and name entering page
    - 
- #### Waiting page
    - 
- #### Quiz page
    - 
- #### In between explanation and ranking/scores page(if host has enabled)
    - 
- #### Final ranking / winnner/ scores page
    -  
- #### Survey page(if the host has created/enabled)
    - 
- #### Redirect to join page

## Host dashboars
- ### Quiz Creation Page redirect
    - Already implemented but clean the ui a bit
- ### Create a New game
    - Needs work
- ### Stats Page
    - Comming later
- ### File
    - Needs work
- ### My Quizes
    - Shows important metas of the most recent 3 question sets
- ### Other Quizes
    - Shows popular(more played) quizes from other creators that are made public
- ### Overall UI
    - Clean the ui and remove unecessary bloat

## Login / Register
- May be implement 2FA / email-verification(may be in future)
- Currently there is no option for password change (needs implementation)
- update Register page to meet the required metas for the db