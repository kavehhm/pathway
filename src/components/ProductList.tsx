import { useEffect } from "react";

import Person from "./Person";
import { api } from "~/utils/api";

/*
  This example requires some changes to your config:
  
  ```
  // tailwind.config.js
  module.exports = {
    // ...
    plugins: [
      // ...
      require('@tailwindcss/aspect-ratio'),
    ],
  }
  ```
*/

type searchType = {
  searchQuery: string;
  selectedMajors: string[];
  selectedSubjects: string[];
  selectedSchools: string[];
  selectedCourses: string[];
  firstSessionFreeOnly: boolean;
  minPrice: number;
  maxPrice: number;
  selectedCompanies: string[];
  careerIsInternship?: boolean;
  transferOnly: boolean;
};

export default function ProductList({
  searchQuery,
  selectedMajors,
  selectedSchools,
  selectedSubjects,
  selectedCourses,
  firstSessionFreeOnly,
  minPrice,
  maxPrice,
  selectedCompanies,
  careerIsInternship,
  transferOnly,
}: searchType) {
  const tutors = api.post.getAllApprovedTutors.useQuery({
    selectedMajors,
    selectedSchools,
    selectedSubjects,
    selectedCourses,
    firstSessionFreeOnly,
    minPrice,
    maxPrice,
    selectedCompanies,
    careerIsInternship,
    transferOnly,
  });

  useEffect(() => {
    void tutors.refetch();
  }, [
    selectedMajors,
    selectedSchools,
    selectedSubjects,
    selectedCourses,
    firstSessionFreeOnly,
    minPrice,
    maxPrice,
    selectedCompanies,
    careerIsInternship,
    transferOnly,
  ]);

  const filteredTutors = tutors.data
    ? tutors.data
        .filter((person) => {
          const q = searchQuery.trim().toLowerCase();
          if (!q) return true;

          const fullName = `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim();
          const haystacks: string[] = [
            fullName,
            person.username ?? "",
            person.school ?? "",
            person.major ?? "",
            person.bio ?? "",
            (person as any).description ?? "",
            ...(Array.isArray(person.subjects) ? person.subjects : []),
            ...((person as any).careerCompanies ?? []),
          ];

          return haystacks.some((value) => value.toLowerCase().includes(q));
        })
    : [];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {tutors.data &&
          filteredTutors.map((person) => (
            <Person
              key={person.id}
              person={{
                major: person.major,
                description: person.bio,
                imageSrc: person.imageSrc,
                name: `${person.firstName} ${person.lastName}`,
                school: person.school,
                username: person.username,
                hourlyRate: person.hourlyRate ?? undefined,
                firstSessionFree: person.firstSessionFree ?? false,
                subjects: person.subjects ?? [],
              }}
            />
          ))}
      </div>
    </div>
  );
}

//   <div key={product.id} className="group relative">
//     <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-md bg-gray-200 lg:aspect-none group-hover:opacity-75 lg:h-80">
//       <img
//         src={product.imageSrc}
//         alt={product.imageAlt}
//         className="h-full w-full object-cover object-center lg:h-full lg:w-full"
//       />
//     </div>
//     <div className="mt-4 flex justify-between">
//       <div>
//         <h3 className="text-sm text-gray-700">
//           <a href={product.href}>
//             <span aria-hidden="true" className="absolute inset-0" />
//             {product.name}
//           </a>
//         </h3>
//         <p className="mt-1 text-sm text-gray-500">{product.color}</p>
//       </div>
//       <p className="text-sm font-medium text-gray-900">{product.price}</p>
//     </div>
//   </div>
