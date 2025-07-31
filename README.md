이제 한 번의 호출로 모든 것이 설정됩니다! Room → Session → Transport → Client → Proxy 전체 과정이 자동으로 처리됩니다.
mcp manager 사용법
 
react 어떻게 가져다붙이는지? 

ai 는 따로넣을필요없는지?

mcp cilent , mcp server, ai 모델 등이 유기적으로 연결되어잇는지?



// 1. 프로젝트(Room) 생성과 첫 번째 서버 연결
const firstConnection = await mcpManager.createRoomWithServer({
  roomName: 'My Project',
  serverName: 'filesystem',
  transportType: 'stdio',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-filesystem'],
});

// 2. 같은 프로젝트에 데이터베이스 서버 추가
const dbConnection = await mcpManager.addServerToRoom(firstConnection.roomId, {
  serverName: 'database',
  transportType: 'stdio',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-postgres'],
  env: { DATABASE_URL: 'postgresql://...' },
});

// 3. API 서버도 추가
const apiConnection = await mcpManager.addServerToRoom(firstConnection.roomId, {
  serverName: 'github-api',
  transportType: 'sse',
  url: 'https://api.github.com/mcp',
});

// 4. 프로젝트의 모든 서버 상태 확인
const status = mcpManager.getRoomStatus(firstConnection.roomId);
console.log(`Project: ${status.room.name}`);
status.servers.forEach(server => {
  console.log(`  - ${server.serverName}: ${server.status}`);
});

// 5. 특정 서버만 연결 해제
await mcpManager.disconnectSession(dbConnection.sessionId);

// 6. 프로젝트 전체 종료
await mcpManager.disconnectRoom(firstConnection.roomId);



ㅍ
설치 방법	제거 내용
NPM	npm uninstall + 디렉토리 삭제
NPX	디렉토리 삭제만 (글로벌 캐시)
PIP	libs 폴더의 패키지+dist-info 삭제 + 디렉토리
UV	uv remove + .venv/uv.lock/pyproject.toml + 디렉토리
UVX	uvx uninstall + 관련 파일들 + 디렉토리
Docker	docker rmi 이미지 삭제 + 디렉토리
Git	디렉토리 삭제
Local	디렉토리 삭제