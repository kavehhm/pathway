import Link from "next/link";

type TutorCardPerson = {
  name: string;
  imageSrc?: string | null;
  school?: string | null;
  major?: string | null;
  description?: string | null;
  username: string;
  hourlyRate?: number;
  firstSessionFree?: boolean;
  subjects?: string[];
};

const SCHOOL_LOGOS: Record<string, string> = {
  ucla: "/ucla.png",
  "universityofcalifornialosangeles": "/ucla.png",
  "ucberkeley": "/berkeley.png",
  "universityofcaliforniaberkeley": "/berkeley.png",
  berkeley: "/berkeley.png",
  northwestern: "/northwestern.png",
  "northwesternuniversity": "/northwestern.png",
  brown: "/brown.png",
  "brownuniversity": "/brown.png",
};

const FALLBACK_AVATAR = "/emit.png";

const normalize = (value: string) =>
  value.toLowerCase().replace(/[\s&().,'-]/g, "");

const getSchoolLogo = (school?: string | null) => {
  if (!school) return undefined;
  const key = normalize(school);
  return SCHOOL_LOGOS[key];
};

const Person = ({ person }: { person: TutorCardPerson }) => {
  const logo = getSchoolLogo(person.school ?? undefined);
  const subjects =
    Array.isArray(person.subjects) && person.subjects.length > 0
      ? person.subjects.slice(0, 2)
      : [];
  const priceLabel =
    typeof person.hourlyRate === "number"
      ? `$${person.hourlyRate}/hr`
      : "Rate available on request";

  return (
    <Link className="group block h-full" href={`/tutors/${person.username}`}>
      <article className="flex h-full flex-col justify-between rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur transition hover:-translate-y-1.5 hover:shadow-xl">
        <div className="flex items-center gap-4">
          <div className="relative h-14 w-14 shrink-0">
            <img
              className="h-14 w-14 rounded-2xl border border-white/80 object-cover shadow"
              src={person.imageSrc ?? FALLBACK_AVATAR}
              alt={person.name}
              loading="lazy"
            />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <p 
              className="line-clamp-3 text-xs font-medium uppercase leading-tight tracking-[0.2em] text-violet-500"
              title={person.school ?? "Campus coming soon"}
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                lineHeight: "1.2"
              }}
            >
              {person.school ?? "Campus coming soon"}
            </p>
            <h3 
              className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-base font-semibold leading-tight text-slate-900"
              title={person.name}
            >
              {person.name}
            </h3>
            <p 
              className="line-clamp-2 text-sm leading-tight text-slate-500"
              title={person.major ?? "Major TBD"}
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                lineHeight: "1.2"
              }}
            >
              {person.major ?? "Major TBD"}
            </p>
          </div>
        </div>

        {person.description && (
          <p
            className="mt-4 text-sm leading-relaxed text-slate-600"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {person.description}
          </p>
        )}

        {subjects.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {subjects.map((subject) => (
              <span
                key={subject}
                className="inline-flex items-center rounded-full bg-violet-100 px-3 py-1 text-[11px] font-medium text-violet-700"
              >
                {subject}
              </span>
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-base font-semibold text-slate-900">
              {priceLabel}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {person.firstSessionFree && (
              <span className="inline-flex items-center whitespace-nowrap rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                First session free
              </span>
            )}
            <span className="inline-flex items-center whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600 transition group-hover:bg-violet-600 group-hover:text-white">
              View profile
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
};

export default Person;