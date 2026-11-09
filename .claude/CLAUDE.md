# WA Automation

Automation using WhatsApp

## Stacks
- Backend: NodeJS
- Frontend: React

## Phase 1
Clone the functionality of WhatsApp web. Look and feel don't need to be exact like
WhatsApp web, but the basic functionalities should be there:
- login
- list of active chats (group and individual). Archived chats should not be shown.
- reading chat and replying chat
- Create README.md

## Phase 2
On the 'Chats' column, split using toggle buttons.
In stead of label 'Chats' put 2 toggle buttons 'Direct' and 'Group'. These buttons will toggles each other. The content will be split into direct message and group message.

For now the icon for group is a green circle with 'G'. Replace 'G' with the first letter of the group name.

## Phase 3
Create a POST endpoint to send a direct message or a group message. Expose the URL on this manner:
- When the user open a chat, on the top of the chat box
  there's a bar with the name of the recipient (individiual or group). On the right side of this bar, add an icon (describing sending a message). 
- Upon clicking on this icon, an in-app popup will appear.
- this popup contains the URL to post message to this 
  recipient.
- Next to the URL is a copy button to copy the URL
- Under it, a short explanation how to use it
- Under it, a close button

Reuses the existing `POST /api/chats/:chatId/messages` endpoint.

The content of the message should be in the body as `{"message": "text"}`.

## Phase 4 - Automation

1. Next to the 'Send' icon (the one which will open a popup), create the 'Automation' icon. When clicked, the Automation popup will appear.
2. The Automation dialog is divided into two columns: 
    - automation name, simply labeld 'Name'
    - automation detail, simply labeld 'Detail'
    - The 'name' column will show the list of automations
    - The 'detail' column will show the detail of the chose automation.
   On the top right corner add the 'Add' button.
3. When the add button is clicked, it will let the user fill a new automation. The detail column will show a form with:
    - 'Name': the name of this automation
    - (only for Group): 'Member': let the user choose 'all' or one of the group member. This should be a combo-box.
    - 'Automation': this is a combo-box, for now only one item 'Thumbs Up'.
    - Then the user can either click on 'Cancel' or 'Add' button.
    - When viewing an automation, there should be an 'Edit' an a 'Delete' button in the 'detail' column.

The automation should only be apply to the individual direct/group. 
The 'Thumbs Up' automation will give thumbs-up reaction on each message, from the chosen member. When the chosen member is 'all' then it will give reaction to all messages in the group or direct chat.

Save the automation for now in a json file.
