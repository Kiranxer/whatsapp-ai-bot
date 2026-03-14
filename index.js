const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys")
const OpenAI = require("openai")
const fs = require("fs")

const openai = new OpenAI({
 apiKey: "YOUR_OPENAI_API_KEY"
})

let memory = JSON.parse(fs.readFileSync("./memory.json"))

async function startBot(){

const { state, saveCreds } = await useMultiFileAuthState("auth")

const sock = makeWASocket({
 auth: state,
 printQRInTerminal: true
})

sock.ev.on("creds.update", saveCreds)

sock.ev.on("messages.upsert", async ({ messages }) => {

const msg = messages[0]
if(!msg.message) return

const sender = msg.key.remoteJid
const text =
msg.message.conversation ||
msg.message.extendedTextMessage?.text

if(!text) return

console.log("User:", text)

/* COMMAND SYSTEM */

if(text.startsWith("!menu")){

await sock.sendMessage(sender,{
text:
`🤖 AI BOT MENU

!ai question
!image prompt
!reset

Example:
!ai tell me a joke`
})

return
}

/* RESET MEMORY */

if(text.startsWith("!reset")){
memory[sender] = []
fs.writeFileSync("./memory.json",JSON.stringify(memory))
await sock.sendMessage(sender,{text:"Memory cleared"})
return
}

/* IMAGE GENERATION */

if(text.startsWith("!image")){

const prompt = text.replace("!image","")

const img = await openai.images.generate({
model:"gpt-image-1",
prompt: prompt,
size:"1024x1024"
})

await sock.sendMessage(sender,{
text:"🖼 Image generated:\n"+img.data[0].url
})

return
}

/* AI CHAT */

if(text.startsWith("!ai")){

const question = text.replace("!ai","")

if(!memory[sender]) memory[sender] = []

memory[sender].push({
role:"user",
content:question
})

const response = await openai.chat.completions.create({
model:"gpt-4o-mini",
messages: memory[sender]
})

const reply = response.choices[0].message.content

memory[sender].push({
role:"assistant",
content:reply
})

fs.writeFileSync("./memory.json",JSON.stringify(memory))

await sock.sendMessage(sender,{text:reply})

}

})

/* ANTI DELETE */

sock.ev.on("messages.update", async m => {

console.log("Message possibly deleted:", m)

})

}

startBot()
