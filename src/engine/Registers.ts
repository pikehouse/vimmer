export type RegisterType = 'linewise' | 'charwise';

interface RegisterEntry {
  text: string;
  type: RegisterType;
}

export class Registers {
  private unnamed: RegisterEntry = { text: '', type: 'charwise' };
  private numbered: RegisterEntry[] = []; // 0-9

  yank(text: string, type: RegisterType): void {
    this.unnamed = { text, type };
  }

  delete(text: string, type: RegisterType): void {
    // Push to numbered registers (1-9, shifting)
    this.numbered.unshift({ text, type });
    if (this.numbered.length > 9) this.numbered.pop();
    this.unnamed = { text, type };
  }

  get(): RegisterEntry {
    return this.unnamed;
  }

  getNumbered(n: number): RegisterEntry | null {
    if (n < 0 || n >= this.numbered.length) return null;
    return this.numbered[n];
  }

  clear(): void {
    this.unnamed = { text: '', type: 'charwise' };
    this.numbered = [];
  }
}
