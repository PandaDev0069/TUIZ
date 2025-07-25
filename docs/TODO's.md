# This is the TODO file created by developr to update the development todo's for this app.

## Major
- (✅)figure out all the db schemas , all the db rows
    - ✅figure out about how we are going to store the order of questions in the question set(may be array or list)

- (✅)setup the image uploading and test the image uploading and importing the images to the ui from the storage bucket
- (✅)migrate the new and updated db schemas in supabase
- use the new updated db and update the backend connections and sockets
-  ## frontend development 
    - (✅)check every single frontend element / login and register are already done 
    - remove un-necessary AI generated buttons and cases that are not in the db 
        - rework the dashboard to remove the unecessary buttons that dont make any sense
    - rework the quiz creator
        - first rework the metadata ceator
        - then questionbuilder form
        - then then settings form 
        - then question reorder 
        - then create the prevew page (implement a new and cool looking prevew which is should be like 90% simlar to the actual quiz view)
        - then create the final Review form for the creation of the quiz
    - dashboard update to show proper metadata of the quiz-list
        - like thumbnail image/ total time/ score/ questions/ etc..
    - clean the dashboard 
    - create a proper fileview for the dashboard to see all the quiz / question-set list in a place
    - create a proper quiz list editing page(use the creator page but fill all the sections/fields with the information)
    - then create / hook all the buttons to the backend and properly comminucate to the db
    - the actual quiz page
        - create from scratch following all the db requirements and minimal db query during the game
    - make sure the quiz-list / questtion-list gets properly loaded first and then proper sync between all the playes and host
    - needs to rework the /join /host /quiz/control etc pages from scratch to follow the db


    - clean the ui and remove the buttons 

- clean the folders / remove un-necessary and redundant files

- after the current content gets properly adjusted to the backend and db
    prepare for the first deployment of frontend and backend
    
- troubleshoot the deployment errors and confirm everything is working properly

- proceed the development.


### Minor



## New and updated Todo list

- ### meta data creator page
    - set proper paths for the thumbnail upload
    - clean the ui
    - after completing the metadata section for the quiz creation proceed to quesiton creation page
- ### questtion creation page
    - properly check the reuired fields from the database schema 
    - clean the ui 
    - setup the proper backend paths for the image uploads
    - properly store the question order 
    - properly implemen the meta data
    - add field to add the explanation page(firs figure out how the explanatio page will be)
    - after all required fields are filled proceed to the settings section
- ### quiz-settings
    - rename the file
    - clean the ui and remove the un-necessary fields that are not in the db
    - update the re-ordring modal to work for the new db
    - use proper meta's
    - procedd to the final confirmation page
- ### confirmation page
    - preview as host
    - preview as player
    - final confirmation of question order(use same modal as settings)
    - when everything is confirmed save to db(in beteween the changes give(一時保存) button to save everything for that time if quiz-creation  couldn't be completed at that time)  