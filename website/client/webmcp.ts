import type {Room} from './api';
// Optional browser capability: uses only the current public route and ordinary API.
export function registerGameTools() {
  const context = (document as Document & {modelContext?: {registerTool: (tool: unknown, options: {signal: AbortSignal}) => unknown}}).modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  try {
    void Promise.resolve(context.registerTool({
      name: 'read_public_match', title: 'قراءة حالة المباراة العامة',
      description: 'Read the display projection of the match on the current room page. Hidden answers and host controls are excluded.',
      inputSchema: {type:'object',properties:{},additionalProperties:false},
      annotations: {readOnlyHint:true,untrustedContentHint:true},
      async execute(input: unknown) {
        if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) throw new Error('Expected an empty object.');
        const match = location.pathname.match(/^\/room\/([A-Za-z0-9_-]{12})\/(host|display|buzzer)$/);
        if (!match) throw new Error('Open a match page first.');
        const response = await fetch(`/api/rooms/${match[1]}?view=display`,{credentials:'same-origin'});
        if (!response.ok) throw new Error('Match unavailable.');
        const room = await response.json() as Room;
        return {id:room.id,round:room.round,teams:room.config.teams,board:room.board,question:room.question,winner:room.winner,buzz:room.buzz};
      }
    },{signal:lifecycle.signal})).catch(()=>{});
  } catch { /* Unsupported experimental interface must not interrupt gameplay. */ }
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
