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

### Add 1
In the chat list both direct and group, when
a chat has one or more automation make the 
user icon circled with purple border.
That's the green circle icon with the member's
or group's initial.

### Add 2
Sort direct message or group, in the list, always on top.

## Phase 5 - New automation 'auto response'
Introduce a new automation, next to 'Thumbs up'. It
is called 'Auto Response'.
This automation will reply on somebody's message for both direct and group chat. These are the rules:
- Never share private information
- Never decide anything in the reply
- Always answer non-private questions, like:
    - How's the weather
    - How much is a kilo apple cost
    - Tell me the recipe for apple pie
- Never react on somebody's reaction, like:
    - thanks
    - no problem
    - I'm good
    - etc
- Send response in the same language as the message you are responding to
- Auto response message should have purple border
- Auto response message should have the text 'AI' at the end, with super script characters.
- [optional] If somebody says happy birthday to somebody else, also say somebody to the one having a birthday. Make your own sentence for this. Remember that you have said happy birthday, so that you do not do this twice.
- [optional] Give reaction when somebody send a link. Try to guess which reaction icon to send.

Use Claude to determine the response. Send to Claude
some messages before the last message to give it 
a context.
For [optional] responses, add check-boxes in the
Automation form. It should behave according to
the user settings. These settings should only appear
for this kind of automation, and should be saved per
chat.
