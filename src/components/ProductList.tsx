import { api } from "~/utils/api";
import Person from "./Person";
import { useEffect } from "react";

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
};

export default function ProductList({
  searchQuery,
  selectedMajors,
  selectedSchools,
  selectedSubjects,
}: searchType) {
  const tutors = api.post.getAllApprovedTutors.useQuery({
    selectedMajors,
    selectedSchools,
    selectedSubjects,
  });

  useEffect(() => {
    const refetchTutor = async () => {
      await tutors.refetch();
    };
    refetchTutor();
  }, [selectedMajors, selectedSchools, selectedSubjects]);

  const filteredTutors = tutors.data
    ? tutors.data.filter((person) => {
        const fullName = `${person.firstName} ${person.lastName}`;
        return (
          fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          person.username?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
    : [];
    

  console.log(searchQuery);
  console.log(filteredTutors);

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-2xl px-4 sm:px-6  lg:max-w-7xl lg:px-8">
        {/* <h2 className="text-2xl font-bold tracking-tight text-gray-900">Customers also purchased</h2> */}

        <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
          {tutors.isFetchedAfterMount &&
            tutors.data &&
            filteredTutors.map((person) => (
              <Person
              key={person.id}
                person={{
                  major: person.major,
                  description: person.bio,
                  imageSrc: person.imageSrc,
                  name: `${person.firstName} ${person.lastName}` ?? "",
                  school: person.school,
                  username: person.username,
                }}
              />
            ))}
        </div>
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
