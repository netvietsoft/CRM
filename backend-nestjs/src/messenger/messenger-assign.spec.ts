import { swrrPick } from './messenger-assign.service';

/* SWRR phải chia XEN KẼ theo tỷ lệ (50/30/20 → A B C A A B A C B A),
 * không dồn hết suất một nhóm rồi mới tới nhóm sau. */
describe('swrrPick (smooth weighted round-robin)', () => {
  const candidates = [
    { key: 'A', weight: 50 },
    { key: 'B', weight: 30 },
    { key: 'C', weight: 20 },
  ];

  it('10 lượt chia đúng 5/3/2 và xen kẽ', () => {
    let credits: Record<string, number> = {};
    const seq: string[] = [];
    for (let i = 0; i < 10; i++) {
      const r = swrrPick(candidates, credits);
      credits = r.credits;
      seq.push(r.picked);
    }
    const count = (k: string) => seq.filter((x) => x === k).length;
    expect(count('A')).toBe(5);
    expect(count('B')).toBe(3);
    expect(count('C')).toBe(2);
    // Xen kẽ: 3 lượt đầu phải đủ 3 nhóm khác nhau (không dồn A A A A A trước).
    expect(new Set(seq.slice(0, 3)).size).toBe(3);
  });

  it('vòng lặp ổn định: 100 lượt vẫn giữ đúng tỷ lệ', () => {
    let credits: Record<string, number> = {};
    const seq: string[] = [];
    for (let i = 0; i < 100; i++) {
      const r = swrrPick(candidates, credits);
      credits = r.credits;
      seq.push(r.picked);
    }
    expect(seq.filter((x) => x === 'A').length).toBe(50);
    expect(seq.filter((x) => x === 'B').length).toBe(30);
    expect(seq.filter((x) => x === 'C').length).toBe(20);
  });

  it('1 ứng viên → luôn chọn ứng viên đó', () => {
    const r = swrrPick([{ key: 'X', weight: 100 }], {});
    expect(r.picked).toBe('X');
  });
});
