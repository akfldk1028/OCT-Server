import { promises as fs } from 'fs';
import * as path from 'path';

type Command = 'view' | 'create' | 'str_replace' | 'insert' | 'undo_edit';

interface EditInput {
  command: Command;
  path: string;
  file_text?: string;
  view_range?: [number, number];
  old_str?: string;
  new_str?: string;
  insert_line?: number;
}

export class EditTool {
  private history = new Map<string, string[]>();

  private MAX_CONTENT_LENGTH = 16000;

  private SNIPPET_LINES = 4;

  async run(input: EditInput): Promise<string> {
    const filePath = path.resolve(input.path);

    // 기본 경로 검증
    await this.validatePath(input.command, filePath);

    switch (input.command) {
      case 'view':
        return this.view(filePath, input.view_range);
      case 'create':
        if (!input.file_text) throw new Error('file_text가 필요합니다');
        await fs.writeFile(filePath, input.file_text, 'utf8');
        this.addToHistory(filePath, []);
        return `파일이 생성되었습니다: ${filePath}`;
      case 'str_replace':
        if (!input.old_str) throw new Error('old_str이 필요합니다');
        return this.replace(filePath, input.old_str, input.new_str || '');
      case 'insert':
        if (input.insert_line === undefined)
          throw new Error('insert_line이 필요합니다');
        if (!input.new_str) throw new Error('new_str이 필요합니다');
        return this.insert(filePath, input.insert_line, input.new_str);
      case 'undo_edit':
        return this.undo(filePath);
      default:
        throw new Error(`알 수 없는 명령: ${input.command}`);
    }
  }

  private async validatePath(
    command: Command,
    filePath: string,
  ): Promise<void> {
    try {
      // 파일 존재 여부 확인
      const exists = await fs
        .stat(filePath)
        .then(() => true)
        .catch(() => false);

      if (!exists && command !== 'create') {
        throw new Error(`경로 ${filePath}가 존재하지 않습니다`);
      }

      if (exists && command === 'create') {
        throw new Error(`파일이 이미 존재합니다: ${filePath}`);
      }

      if (exists && command !== 'view') {
        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) {
          throw new Error(
            `${filePath}는 디렉토리입니다. 디렉토리에는 'view' 명령만 사용할 수 있습니다`,
          );
        }
      }
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error(`경로 검증 오류: ${error}`);
    }
  }

  private async view(
    filePath: string,
    range?: [number, number],
  ): Promise<string> {
    try {
      const stats = await fs.stat(filePath);

      if (stats.isDirectory()) {
        const files = await fs.readdir(filePath);
        return `${filePath} 디렉토리 내용:\n${files.join('\n')}`;
      }

      let content = await fs.readFile(filePath, 'utf8');

      // 내용이 너무 길면 잘라내기
      if (content.length > this.MAX_CONTENT_LENGTH) {
        content = `${content.substring(
          0,
          this.MAX_CONTENT_LENGTH,
        )}\n...<너무 큰 파일이라 내용이 잘렸습니다>...`;
      }

      const lines = content.split('\n');

      if (range) {
        const [start, end] = range;
        if (start < 1 || (end !== -1 && end < start)) {
          throw new Error(`유효하지 않은 범위: ${range}`);
        }

        const finalEnd =
          end === -1 ? lines.length : Math.min(end, lines.length);
        const selectedLines = lines.slice(start - 1, finalEnd);

        return selectedLines
          .map((line, i) => `${i + start}\t${line}`)
          .join('\n');
      }

      return lines.map((line, i) => `${i + 1}\t${line}`).join('\n');
    } catch (error) {
      throw new Error(`파일 읽기 오류: ${error}`);
    }
  }

  private async replace(
    filePath: string,
    oldStr: string,
    newStr: string,
  ): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf8');

      // 발생 횟수 확인
      const count = content.split(oldStr).length - 1;

      if (count === 0) {
        throw new Error(`'${oldStr}'이 파일에 없습니다`);
      }

      if (count > 1) {
        const lineNums = content
          .split('\n')
          .map((line, i) => (line.includes(oldStr) ? i + 1 : -1))
          .filter((num) => num !== -1);

        throw new Error(
          `'${oldStr}'이 ${lineNums.join(', ')} 줄에 여러 번 나타납니다`,
        );
      }

      // 히스토리에 저장
      this.addToHistory(filePath, content);

      // 대체
      const newContent = content.replace(oldStr, newStr);
      await fs.writeFile(filePath, newContent, 'utf8');

      // 스니펫 생성
      const firstPart = content.split(oldStr)[0];
      const replaceLine = firstPart.split('\n').length;
      const startLine = Math.max(1, replaceLine - this.SNIPPET_LINES);
      const endLine = Math.min(
        newContent.split('\n').length,
        replaceLine + newStr.split('\n').length + this.SNIPPET_LINES,
      );

      const snippet = newContent
        .split('\n')
        .slice(startLine - 1, endLine)
        .map((line, i) => `${i + startLine}\t${line}`)
        .join('\n');

      return `파일 ${filePath}이 수정되었습니다. 스니펫:\n${snippet}`;
    } catch (error) {
      throw new Error(`파일 수정 오류: ${error}`);
    }
  }

  private async insert(
    filePath: string,
    lineNum: number,
    text: string,
  ): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');

      if (lineNum < 0 || lineNum > lines.length) {
        throw new Error(
          `유효하지 않은 줄 번호: ${lineNum}, 파일은 ${lines.length}줄입니다`,
        );
      }

      this.addToHistory(filePath, content);

      const newLines = [
        ...lines.slice(0, lineNum),
        text,
        ...lines.slice(lineNum),
      ];

      const newContent = newLines.join('\n');
      await fs.writeFile(filePath, newContent, 'utf8');

      const startLine = Math.max(1, lineNum - this.SNIPPET_LINES);
      const endLine = Math.min(
        newContent.split('\n').length,
        lineNum + text.split('\n').length + this.SNIPPET_LINES,
      );

      const snippet = newLines
        .slice(startLine - 1, endLine)
        .map((line, i) => `${i + startLine}\t${line}`)
        .join('\n');

      return `파일 ${filePath}에 텍스트가 삽입되었습니다. 스니펫:\n${snippet}`;
    } catch (error) {
      throw new Error(`파일 삽입 오류: ${error}`);
    }
  }

  private async undo(filePath: string): Promise<string> {
    const history = this.history.get(filePath);

    if (!history || history.length === 0) {
      throw new Error(`${filePath}에 실행 취소할 내용이 없습니다`);
    }

    const prevContent = history.pop()!;
    await fs.writeFile(filePath, prevContent, 'utf8');

    return `${filePath}의 마지막 수정이 실행 취소되었습니다`;
  }

  private addToHistory(filePath: string, content: string) {
    if (!this.history.has(filePath)) {
      this.history.set(filePath, []);
    }
    this.history.get(filePath)!.push(content);
  }
}
